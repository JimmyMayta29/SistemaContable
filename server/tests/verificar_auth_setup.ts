import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const esReinicio = process.argv.includes('--reinicio');
const real = process.argv.includes('--postgres') || esReinicio;
let administrador: Pool | undefined;
let baseTemporal: string | undefined;
process.env.NODE_ENV = 'test';
if (real) {
  if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL_REQUERIDA: use una base PostgreSQL real descartable.');
  const target = new URL(process.env.TEST_DATABASE_URL);
  if (!target.pathname.endsWith('_test')) throw new Error('La base descartable debe terminar en _test.');
  if (!esReinicio) {
    administrador = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    baseTemporal = `auth_${crypto.randomUUID().replaceAll('-', '')}_test`;
    await administrador.query(`CREATE DATABASE "${baseTemporal}"`);
    target.pathname = `/${baseTemporal}`;
    process.env.TEST_DATABASE_URL = target.toString();
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  delete process.env.DATABASE_URL;
}

const { db, initializeDatabase, closeDatabase } = await import('../config/database');
const { authJwtService, USUARIOS_ESTUDIO_MEMORIA, USUARIOS_EMPRESA_MEMORIA, REFRESH_TOKENS_MEMORIA } = await import('../services/authJwtService');
const { setupService } = await import('../services/setupService');
const { empresaRepository } = await import('../repositories/empresaRepository');
const { totpService } = await import('../services/totpService');

async function limpiarBase() {
  await closeDatabase();
  if (administrador && baseTemporal) {
    try {
      await administrador.query(`DROP DATABASE "${baseTemporal}" WITH (FORCE)`);
    } finally {
      await administrador.end();
    }
  }
}

if (real) {
  try {
    await initializeDatabase();
    assert.match((await db.query('SELECT version() AS version')).rows[0].version, /^PostgreSQL /);
    if (!esReinicio) await (await import('../db/migrate')).runMigrations();
  } catch (err) {
    await limpiarBase();
    throw err;
  }
}

if (esReinicio) {
  try {
    const input = JSON.parse(fs.readFileSync(0, 'utf8'));
    assert.equal((await setupService.obtenerEstadoSetup()).estudio?.nombreEstudio, input.nombreEstudio);
    const login = await authJwtService.login(input.email, input.password, totpService.generarToken(input.secret));
    assert.equal(login.usuario.id, input.usuarioId);
    if (input.revocado) {
      await assert.rejects(() => authJwtService.refreshAccessToken(input.refreshToken), /revocada/);
    } else {
      assert.ok((await authJwtService.refreshAccessToken(input.refreshToken)).accessToken);
    }
    process.stdout.write('AUTH_REINICIO_OK\n');
  } finally {
    await closeDatabase();
  }
} else {
  try {
    assert.equal(await setupService.estaConfigurado(), false, 'La prueba requiere un estudio vacío.');
    const mfa = setupService.generarMfaSecret('admin@prueba.local');
    assert.equal(totpService.decodeBase32(mfa.secret).length, 20);
    const input = {
      nombreEstudio: 'Estudio de verificación', rucEstudio: '20000000001',
      emailContacto: 'contacto@prueba.local', telefonoContacto: '999123456',
      adminNombre: 'Administrador de prueba', adminEmail: 'admin@prueba.local', adminPassword: 'PruebaSegura2026!',
      mfaSecret: mfa.secret, mfaCodigoVerificacion: totpService.generarToken(mfa.secret)
    };
    const antes = real ? (await db.query('SELECT (SELECT count(*) FROM tenants) AS tenants, (SELECT count(*) FROM usuarios_estudio) AS usuarios')).rows[0] : null;
    const emitirSesion = authJwtService.emitirSesion;
    authJwtService.emitirSesion = async () => { throw new Error('FALLO_SESION_INYECTADO'); };
    try {
      await assert.rejects(() => setupService.inicializarEstudio(input), /FALLO_SESION_INYECTADO/);
    } finally {
      authJwtService.emitirSesion = emitirSesion;
    }
    assert.equal(await setupService.estaConfigurado(), false, 'Un fallo al emitir sesión no deja un administrador creado.');
    assert.equal((await setupService.obtenerEstadoSetup()).estudio, null);
    if (real) {
      assert.deepEqual((await db.query('SELECT (SELECT count(*) FROM tenants) AS tenants, (SELECT count(*) FROM usuarios_estudio) AS usuarios')).rows[0], antes);
      assert.equal(Number((await db.query('SELECT count(*) FROM refresh_tokens')).rows[0].count), 0);
    }

    input.mfaCodigoVerificacion = totpService.generarToken(mfa.secret);
    const carreras = await Promise.allSettled([setupService.inicializarEstudio(input), setupService.inicializarEstudio(input)]);
    assert.equal(carreras.filter(r => r.status === 'fulfilled').length, 1, 'Solo una configuración concurrente se confirma.');
    const sesion = carreras.find(r => r.status === 'fulfilled');
    assert.ok(sesion?.status === 'fulfilled');
    const inicial = sesion.value;
    assert.equal(inicial.empresaActivaId, '');
    assert.deepEqual(inicial.empresasPermitidas, []);
    assert.equal(inicial.usuario.rolGlobal, 'ADMINISTRADOR');
    assert.ok(inicial.estudio.tenantId);
    assert.equal(authJwtService.verificarAccessToken(inicial.accessToken).mfaVerificado, true);
    assert.throws(() => authJwtService.verificarAccessToken(inicial.refreshToken), /TOKEN_INVALIDO/);
    await assert.rejects(() => authJwtService.login(input.adminEmail, 'equivocada'), /CREDENCIALES_INVALIDAS/);
    await assert.rejects(() => authJwtService.login(input.adminEmail, input.adminPassword), /MFA_REQUERIDO/);

    const nueva = await empresaRepository.crear({
      tenantId: inicial.estudio.tenantId, usuarioId: inicial.usuario.id, codigoEmpresa: 'PRUEBA01',
      ruc: '20000000001', razonSocial: 'Empresa de verificación', regimenTributario: 'MYPE_TRIBUTARIO',
      domicilioFiscal: 'Dirección de prueba 123', monedaPrincipal: 'PEN'
    });
    assert.equal((await authJwtService.obtenerMembresias(inicial.usuario.id))[0].empresaId, nueva.id);
    const seleccion = await authJwtService.cambiarEmpresaActiva(inicial.usuario.id, nueva.id, true);
    assert.equal(seleccion.empresaActivaId, nueva.id);
    assert.equal(authJwtService.verificarAccessToken((await authJwtService.refreshAccessToken(seleccion.refreshToken)).accessToken).empresaId, nueva.id);
    await assert.rejects(() => authJwtService.cambiarEmpresaActiva(inicial.usuario.id, crypto.randomUUID()), /ACCESO_DENEGADO_EMPRESA/);
    if (real) await db.query('DELETE FROM usuario_empresa WHERE usuario_id = $1 AND empresa_id = $2', [inicial.usuario.id, nueva.id]);
    else USUARIOS_EMPRESA_MEMORIA.splice(USUARIOS_EMPRESA_MEMORIA.findIndex(m => m.usuarioId === inicial.usuario.id && m.empresaId === nueva.id), 1);
    assert.equal((await authJwtService.cambiarEmpresaActiva(inicial.usuario.id, nueva.id, true)).empresaActivaId, nueva.id,
      'El administrador del estudio puede seleccionar una empresa activa sin asignación individual.');

    const contadorId = crypto.randomUUID();
    const administradorActual = (await authJwtService.obtenerUsuarioPorId(inicial.usuario.id))!;
    if (real) {
      await db.query(`INSERT INTO usuarios_estudio (id, email, password_hash, nombre, rol_global)
        VALUES ($1, 'contador@prueba.local', $2, 'Contador de prueba', 'CONTADOR_SENIOR')`, [contadorId, administradorActual.passwordHash]);
    } else {
      USUARIOS_ESTUDIO_MEMORIA.push({ ...administradorActual, id: contadorId, email: 'contador@prueba.local', rolGlobal: 'CONTADOR_SENIOR', mfaActivado: false, mfaSecret: undefined });
    }
    assert.deepEqual(await empresaRepository.listarPorUsuario(contadorId), [], 'Sin membresías no se filtra información de otras empresas.');
    if (real) {
      await db.query(`INSERT INTO usuario_empresa (usuario_id, empresa_id, rol_en_empresa) VALUES ($1, $2, 'CONTADOR_SENIOR')`, [contadorId, nueva.id]);
    } else {
      USUARIOS_EMPRESA_MEMORIA.push({ id: crypto.randomUUID(), usuarioId: contadorId, empresaId: nueva.id, rolEnEmpresa: 'CONTADOR_SENIOR', estado: 'ACTIVO', createdAt: new Date().toISOString() });
    }
    assert.deepEqual((await empresaRepository.listarPorUsuario(contadorId)).map(e => e.id), [nueva.id]);
    if (real) {
      const empresaAjena = await empresaRepository.crear({
        tenantId: inicial.estudio.tenantId, usuarioId: inicial.usuario.id, codigoEmpresa: 'PRUEBA02',
        ruc: '20100047218', razonSocial: 'Empresa ajena al contador', regimenTributario: 'MYPE_TRIBUTARIO',
        domicilioFiscal: 'Dirección de otra empresa 456', monedaPrincipal: 'PEN'
      });
      const contador = await authJwtService.login('contador@prueba.local', input.adminPassword);
      const express = (await import('express')).default;
      const { apiRoutes } = await import('../routes');
      const app = express();
      app.use(express.json());
      app.use('/api', apiRoutes);
      const servidor = app.listen(0, '127.0.0.1');
      await new Promise<void>((resolve, reject) => {
        servidor.once('listening', resolve);
        servidor.once('error', reject);
      });
      try {
        const direccion = servidor.address();
        assert.ok(direccion && typeof direccion !== 'string');
        const base = `http://127.0.0.1:${direccion.port}/api`;
        const bootstrap = await fetch(`${base}/auth/perfil`, { headers: { authorization: `Bearer ${inicial.accessToken}` } });
        assert.equal(bootstrap.status, 200, 'La sesión administrativa sin empresa puede consultar su perfil.');
        assert.equal((await bootstrap.json()).data.empresaActivaId, '');
        const autorizada = await fetch(`${base}/empresas/${nueva.id}`, { headers: { authorization: `Bearer ${contador.accessToken}` } });
        assert.equal(autorizada.status, 200);
        await autorizada.arrayBuffer();
        const ajena = await fetch(`${base}/empresas/${empresaAjena.id}`, { headers: { authorization: `Bearer ${contador.accessToken}` } });
        assert.equal(ajena.status, 403, 'El middleware real impide usar el token de A para leer B.');
        await ajena.arrayBuffer();
        const refreshComoAccess = await fetch(`${base}/auth/perfil`, { headers: { authorization: `Bearer ${contador.refreshToken}` } });
        assert.equal(refreshComoAccess.status, 401);
        await refreshComoAccess.arrayBuffer();
        const accessComoRefresh = await fetch(`${base}/auth/refresh`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: contador.accessToken })
        });
        assert.equal(accessComoRefresh.status, 401);
        await accessComoRefresh.arrayBuffer();
        await db.query("UPDATE usuario_empresa SET estado = 'REVOCADO' WHERE usuario_id = $1", [contadorId]);
        const revocada = await fetch(`${base}/empresas/${nueva.id}`, { headers: { authorization: `Bearer ${contador.accessToken}` } });
        assert.equal(revocada.status, 403, 'Revocar la membresía bloquea inmediatamente el acceso HTTP de la sesión vigente.');
        await revocada.arrayBuffer();
        console.log('AUTH_HTTP_POSTGRES_OK: perfil bootstrap 200, acceso ajeno y revocado 403, tipos de token 401.');
      } finally {
        servidor.closeAllConnections();
        await new Promise<void>((resolve, reject) => servidor.close(err => err ? reject(err) : resolve()));
      }
    } else USUARIOS_EMPRESA_MEMORIA.find(m => m.usuarioId === contadorId)!.estado = 'REVOCADO';
    assert.deepEqual(await empresaRepository.listarPorUsuario(contadorId), [], 'Revocar la membresía elimina el acceso del listado.');

    if (real) {
      USUARIOS_ESTUDIO_MEMORIA.length = 0;
      USUARIOS_EMPRESA_MEMORIA.length = 0;
      REFRESH_TOKENS_MEMORIA.length = 0;
      await closeDatabase();
      const restartInput = {
        nombreEstudio: input.nombreEstudio, email: input.adminEmail, password: input.adminPassword,
        secret: input.mfaSecret, usuarioId: inicial.usuario.id, refreshToken: seleccion.refreshToken, revocado: false
      };
      const reiniciar = () => {
        const child = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), '--reinicio'], {
          cwd: process.cwd(), env: process.env, input: JSON.stringify(restartInput), encoding: 'utf8', timeout: 20000
        });
        assert.equal(child.status, 0, child.stderr);
        assert.match(child.stdout, /AUTH_REINICIO_OK/);
      };
      reiniciar();
      await initializeDatabase();
      await authJwtService.revocarRefreshToken(seleccion.refreshToken, inicial.usuario.id);
      await closeDatabase();
      restartInput.revocado = true;
      reiniciar();
    } else {
      await authJwtService.revocarRefreshToken(seleccion.refreshToken, inicial.usuario.id);
      await assert.rejects(() => authJwtService.refreshAccessToken(seleccion.refreshToken), /revocada/);
    }
    console.log(real ? 'AUTH_SETUP_POSTGRES_OK: transacción, concurrencia y persistencia tras reinicio verificadas.' : 'AUTH_SETUP_MEMORIA_OK: configuración inicial, MFA, alta y selección de empresa verificadas.');
  } finally {
    await limpiarBase();
  }
}
