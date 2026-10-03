import fs from 'fs';
import path from 'path';
import { db } from '../config/database';
import { runSeeds } from './seed';
import { runCatalogosSeeds } from './seed_catalogos';

export async function runMigrations() {
  if (!db.isPostgresConnected()) {
    console.log('ℹ️ [Migrations] PostgreSQL no conectado. Saltando ejecución DDL.');
    return;
  }

  console.log('🚀 [Migrations] Ejecutando migración DDL...');
  try {
    const sqlFiles = ['schema.sql', 'schema_fase2.sql', 'triggers_fase2.sql', 'schema_fase3.sql', 'schema_fase4.sql', 'schema_fase6.sql'];
    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf8');
        await db.query(sql);
        console.log(`✅ [Migrations] Archivo ${file} ejecutado.`);
      }
    }
    await runSeeds();
    await runCatalogosSeeds();
  } catch (error) {
    console.error('❌ [Migrations] Error en migración DDL:', error);
  }
}
