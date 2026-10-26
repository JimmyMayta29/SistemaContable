import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

export interface DatabaseService {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  getClient(): Promise<PoolClient>;
  isPostgresConnected(): boolean;
  withTenantAndEmpresa<T>(userId: string, empresaId: string, action: (client: PoolClient) => Promise<T>): Promise<T>;
  withEmpresaTransaction<T>(empresaId: string, action: (client: PoolClient) => Promise<T>): Promise<T>;
}

let pool: Pool | null = null;
let isConnected = false;

export async function initializeDatabase(): Promise<void> {
  if (pool && isConnected) return;
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL_REQUERIDA: Configure PostgreSQL antes de iniciar el servidor.');
  const candidate = new Pool({ connectionString: env.DATABASE_URL, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
  candidate.on('error', () => { isConnected = false; });
  try {
    await candidate.query('SELECT 1');
    pool = candidate;
    isConnected = true;
  } catch (error) {
    await candidate.end();
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  const current = pool;
  pool = null;
  isConnected = false;
  await current?.end();
}

export function setPostgresPool(customPool: Pool | any, connected = true) {
  if (env.NODE_ENV !== 'test') throw new Error('El reemplazo de PostgreSQL solo está disponible en pruebas.');
  pool = customPool;
  isConnected = connected && customPool !== null;
}

async function transaction<T>(empresaId: string, userId: string | undefined, action: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!pool || !isConnected) {
    if (env.NODE_ENV === 'test' && !env.DATABASE_URL) return action({} as PoolClient);
    throw new Error('DATABASE_NO_DISPONIBLE');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_empresa_id', $1, true), set_config('app.empresa_id', $1, true)", [empresaId]);
    if (userId) await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const db: DatabaseService = {
  isPostgresConnected: () => isConnected && pool !== null,
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!pool || !isConnected) throw new Error('DATABASE_NO_DISPONIBLE');
    return pool.query<T>(text, params);
  },
  async getClient(): Promise<PoolClient> {
    if (!pool || !isConnected) throw new Error('DATABASE_NO_DISPONIBLE');
    return pool.connect();
  },
  withTenantAndEmpresa: (userId, empresaId, action) => transaction(empresaId, userId, action),
  withEmpresaTransaction: (empresaId, action) => transaction(empresaId, undefined, action)
};
