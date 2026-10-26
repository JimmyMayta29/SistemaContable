import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { db } from '../config/database';
import { runSeeds } from './seed';
import { runCatalogosSeeds } from './seed_catalogos';

export const MIGRATION_FILES = ['schema_a_preflight.sql', 'schema.sql', 'schema_fase2.sql', 'schema_fase3.sql', 'schema_fase4.sql', 'schema_fase5.sql', 'schema_fase6.sql', 'schema_fase7.sql', 'schema_a_compat.sql', 'triggers_fase2.sql'] as const;

export async function runMigrations() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(738291004)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (nombre TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const existing = await client.query<{ nombre: string; sha256: string }>('SELECT nombre, sha256 FROM schema_migrations');
    const applied = new Map(existing.rows.map(row => [row.nombre, row.sha256]));
    for (const file of MIGRATION_FILES) {
      const sql = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
      const hash = createHash('sha256').update(sql).digest('hex');
      if (applied.has(file)) {
        if (applied.get(file) !== hash) throw new Error(`MIGRACION_MODIFICADA: ${file}. Agregue una migración nueva.`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (nombre, sha256) VALUES ($1, $2)', [file, hash]);
    }
    await runSeeds(client);
    await runCatalogosSeeds(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
