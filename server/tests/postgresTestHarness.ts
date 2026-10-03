import { newDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { setPostgresPool } from '../config/database';

export async function setupPostgresTestHarness() {
  const memDb = newDb();

  // Registrar extensiones y funciones PostgreSQL
  memDb.registerExtension('uuid-ossp', (schema) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      implementation: () => crypto.randomUUID()
    });
  });

  memDb.registerExtension('pgcrypto', (schema) => {
    schema.registerFunction({
      name: 'gen_random_uuid',
      implementation: () => crypto.randomUUID()
    });
  });

  memDb.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 15.0 (pg-mem automated test container)'
  });

  // Emulación de variables de sesión para RLS
  let currentEmpresaId = '';
  let currentUserId = '';

  memDb.public.registerFunction({
    name: 'set_config',
    args: [memDb.public.getType('text' as any), memDb.public.getType('text' as any), memDb.public.getType('boolean' as any)],
    implementation: (name: string, val: string) => {
      if (name === 'app.empresa_id' || name === 'app.current_empresa_id') {
        currentEmpresaId = val;
      }
      if (name === 'app.current_user_id') {
        currentUserId = val;
      }
      return val;
    }
  });

  memDb.public.registerFunction({
    name: 'current_setting',
    args: [memDb.public.getType('text' as any), memDb.public.getType('boolean' as any)],
    implementation: (settingName: string) => {
      if (settingName === 'app.empresa_id' || settingName === 'app.current_empresa_id') {
        return currentEmpresaId;
      }
      if (settingName === 'app.current_user_id') {
        return currentUserId;
      }
      return '';
    }
  });

  // Cargar schemas SQL estándar
  const dbDir = path.resolve(process.cwd(), 'server/db');
  const schemaFiles = [
    'schema.sql',
    'schema_fase2.sql',
    'schema_fase3.sql',
    'schema_fase4.sql',
    'schema_fase5.sql',
    'schema_fase6.sql'
  ];

  for (const file of schemaFiles) {
    const fullPath = path.join(dbDir, file);
    if (fs.existsSync(fullPath)) {
      const sql = fs.readFileSync(fullPath, 'utf8');
      try {
        memDb.public.none(sql);
      } catch (e: any) {
        // Ignorar sentencias avanzadas que pg-mem no interprete directamente
      }
    }
  }

  // Interceptar SET LOCAL para actualizar las variables de sesión
  memDb.on('query', (q: string) => {
    const mEmp = q.match(/SET LOCAL (?:app\.empresa_id|app\.current_empresa_id) = '([^']+)'/i);
    if (mEmp) currentEmpresaId = mEmp[1];
    const mUsr = q.match(/SET LOCAL app\.current_user_id = '([^']+)'/i);
    if (mUsr) currentUserId = mUsr[1];
  });

  const pg = memDb.adapters.createPg();
  const pool = new pg.Pool();

  // Activar en el servicio de base de datos
  setPostgresPool(pool, true);

  return {
    memDb,
    pool,
    tearDown: () => {
      setPostgresPool(null, false);
      pool.end();
    }
  };
}
