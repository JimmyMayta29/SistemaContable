import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { Pool } from 'pg';
import { MIGRATION_FILES } from '../../db/migrate';

const databaseUrl = process.env.TEST_DATABASE_URL;
assert(databaseUrl, 'TEST_DATABASE_URL debe apuntar a PostgreSQL real descartable.');
const admin = new Pool({ connectionString: databaseUrl });
const prefix = `infra_${crypto.randomUUID().replaceAll('-', '')}`;
const databases = [`${prefix}_ok`, `${prefix}_fallo`, `${prefix}_legado`];
const secrets = { JWT_SECRET: crypto.randomBytes(32).toString('hex'), JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'), SUNAT_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex') };
const migrate = `const d=await import('./server/config/database.ts');try{await d.initializeDatabase();await(await import('./server/db/migrate.ts')).runMigrations()}finally{await d.closeDatabase()}`;

function run(code: string, url: string) {
  return spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 30000,
    env: { ...process.env, ...secrets, NODE_ENV: 'test', DATABASE_URL: url }
  });
}

async function bootServer(url: string) {
  const socket = createServer();
  await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { env: { ...process.env, ...secrets, NODE_ENV: 'production', DATABASE_URL: url, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  child.stdout.on('data', chunk => { output += String(chunk); });
  child.stderr.on('data', chunk => { output += String(chunk); });
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`El servidor no anunció disponibilidad: ${output.slice(-1500)}`)), 30000);
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', () => { clearTimeout(timeout); reject(new Error(`El servidor terminó antes de estar disponible: ${output.slice(-1500)}`)); });
      child.stdout.on('data', () => { if (output.includes('corriendo en')) { clearTimeout(timeout); resolve(); } });
    });
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).database, 'POSTGRESQL_CONNECTED');
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
      child.kill();
      await exited;
    }
  }
}

try {
  const real = await admin.query("SELECT current_setting('server_version_num')::int AS version, inet_server_port() AS port, pg_postmaster_start_time() AS started");
  assert(real.rows[0].version >= 140000 && real.rows[0].port > 0 && real.rows[0].started, 'La prueba requiere un servidor PostgreSQL real.');
  for (const name of databases) await admin.query(`CREATE DATABASE "${name}"`);
  const urls = databases.map(name => { const url = new URL(databaseUrl); url.pathname = `/${name}`; return url.toString(); });
  const fresh = run(migrate, urls[0]);
  assert.equal(fresh.status, 0, fresh.stderr);
  const restart = run(migrate, urls[0]);
  assert.equal(restart.status, 0, restart.stderr);
  const verified = new Pool({ connectionString: urls[0] });
  try {
    const counts = await verified.query('SELECT (SELECT COUNT(*) FROM schema_migrations)::int AS migrations, (SELECT COUNT(*) FROM usuarios_estudio)::int AS users, (SELECT COUNT(*) FROM estudio_configuracion)::int AS setup');
    assert.equal(counts.rows[0].migrations, MIGRATION_FILES.length);
    assert.equal(counts.rows[0].users, 0, 'El arranque no crea administradores con claves fijas.');
    assert.equal(counts.rows[0].setup, 0);
  } finally { await verified.end(); }
  console.log('PASS: esquema completo vacío y segundo proceso tras reconexión.');
  await bootServer(urls[0]);
  await bootServer(urls[0]);
  console.log('PASS: servidor HTTP inicia y reinicia con el esquema persistente disponible.');

  const broken = new Pool({ connectionString: urls[1] });
  try {
    await broken.query('CREATE TABLE tenants(id INTEGER PRIMARY KEY)');
    const failure = run(migrate, urls[1]);
    assert.notEqual(failure.status, 0, 'Una migración inválida debe abortar.');
    const remains = await broken.query("SELECT to_regclass('usuarios_estudio') AS users, to_regclass('schema_migrations') AS ledger");
    assert.equal(remains.rows[0].users, null);
    assert.equal(remains.rows[0].ledger, null, 'La migración fallida revierte también su registro.');
  } finally { await broken.end(); }
  console.log('PASS: migración fallida revierte el esquema completo.');

  const legacy = new Pool({ connectionString: urls[2] });
  try {
    await legacy.query(`CREATE TABLE usuarios_estudio (
      id VARCHAR(50) PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL, rol_global TEXT NOT NULL CHECK (rol_global IN ('ADMIN_ESTUDIO','CONTADOR_SENIOR','ASISTENTE_CONTABLE','AUDITOR_REVISOR')),
      mfa_secret TEXT, mfa_activado BOOLEAN DEFAULT FALSE, is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE evidencia_actor(id INTEGER PRIMARY KEY, usuario_id VARCHAR(50) REFERENCES usuarios_estudio(id));
      INSERT INTO usuarios_estudio(id,email,password_hash,nombre,rol_global) VALUES ('usuario-anterior','anterior@example.invalid','hash-anterior','Anterior','ADMIN_ESTUDIO');
      INSERT INTO evidencia_actor VALUES (1,'usuario-anterior')`);
    const upgraded = run(migrate, urls[2]);
    assert.equal(upgraded.status, 0, upgraded.stderr);
    const identity = await legacy.query('SELECT u.id, u.legacy_id, u.password_hash, u.rol_global, e.usuario_id FROM usuarios_estudio u JOIN evidencia_actor e ON e.usuario_id=u.id');
    assert.equal(identity.rowCount, 1);
    assert.equal(identity.rows[0].id, identity.rows[0].usuario_id);
    assert.equal(identity.rows[0].legacy_id, 'usuario-anterior');
    assert.equal(identity.rows[0].password_hash, 'hash-anterior');
    assert.equal(identity.rows[0].rol_global, 'ADMINISTRADOR');
  } finally { await legacy.end(); }
  console.log('PASS: identidad anterior conserva clave y relaciones al migrar a UUID.');

  const unavailable = new URL(databaseUrl); unavailable.hostname = '127.0.0.1'; unavailable.port = '1';
  const startup = spawnSync(process.execPath, ['--import', 'tsx', 'server.ts'], { encoding: 'utf8', timeout: 15000, env: { ...process.env, ...secrets, NODE_ENV: 'production', DATABASE_URL: unavailable.toString() } });
  assert(startup.status !== null && startup.status !== 0, 'El servidor debe terminar con error cuando PostgreSQL no responde.');
  assert(!startup.stdout.includes('corriendo en'));
  const missingSecret = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "await import('./server/config/env.ts')"], { encoding: 'utf8', timeout: 15000, env: { ...process.env, ...secrets, NODE_ENV: 'production', DATABASE_URL: urls[0], JWT_REFRESH_SECRET: '' } });
  assert.notEqual(missingSecret.status, 0);
  console.log('PASS: arranque cerrado ante conexión fallida o secreto obligatorio ausente.');
} finally {
  for (const name of databases) {
    assert(name.startsWith(`${prefix}_`) && /^[a-z0-9_]+$/.test(name));
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  }
  await admin.end();
}
