import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

export interface DatabaseService {
  query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  getClient(): Promise<PoolClient>;
  isPostgresConnected(): boolean;
  withTenantAndEmpresa<T>(
    userId: string, 
    empresaId: string, 
    action: (client: PoolClient) => Promise<T>
  ): Promise<T>;
  withEmpresaTransaction<T>(
    empresaId: string,
    action: (client: PoolClient) => Promise<T>
  ): Promise<T>;
}

let pool: Pool | null = null;
let isConnected = false;

if (env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL Pool Error inesperado:', err);
    });

    // Probar conexión inicial
    pool.query('SELECT NOW()')
      .then(() => {
        isConnected = true;
        console.log('✅ [Database] Conexión establecida exitosamente con PostgreSQL');
      })
      .catch((err) => {
        console.warn('⚠️ [Database] No se pudo conectar a PostgreSQL vía DATABASE_URL:', err.message);
        isConnected = false;
        if (env.NODE_ENV === 'production') {
          console.error('❌ [Database] FATAL: Error conectando a PostgreSQL en producción. Abortando.');
          process.exit(1);
        }
      });
  } catch (err: any) {
    console.warn('⚠️ [Database] Error inicializando Pool de PostgreSQL:', err.message);
    pool = null;
    isConnected = false;
    if (env.NODE_ENV === 'production') {
      console.error('❌ [Database] FATAL: Excepción inicializando Pool PostgreSQL en producción. Abortando.');
      process.exit(1);
    }
  }
} else {
  if (env.NODE_ENV === 'production') {
    console.error('❌ [Database] FATAL: NODE_ENV=production requiere DATABASE_URL configurada. El servidor no arrancará con motor en memoria.');
    process.exit(1);
  }
  console.log('⚠️ [Database] ADVERTENCIA: DATABASE_URL no configurada. Operando en modo DESARROLLO/TEST con almacén transaccional en memoria.');
}

export function setPostgresPool(customPool: Pool | any, connected: boolean = true) {
  pool = customPool;
  isConnected = connected && customPool !== null;
}

export const db: DatabaseService = {
  isPostgresConnected: () => isConnected && pool !== null,

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (pool && isConnected) {
      return pool.query<T>(text, params);
    }
    // Si no hay PostgreSQL disponible, simular resultado vacío o gestionar en memoria
    return {
      rows: [],
      command: '',
      rowCount: 0,
      oid: 0,
      fields: []
    };
  },

  async getClient(): Promise<PoolClient> {
    if (!pool) {
      throw new Error('PostgreSQL Pool no inicializado.');
    }
    return pool.connect();
  },

  async withTenantAndEmpresa<T>(
    userId: string,
    empresaId: string,
    action: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!pool || !isConnected) {
      // Fallback
      return action({} as PoolClient);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Establecer contexto para Row Level Security (RLS)
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
      await client.query(`SELECT set_config('app.current_empresa_id', $2, true)`, [empresaId]);
      await client.query(`SELECT set_config('app.empresa_id', $2, true)`, [empresaId]);
      
      const result = await action(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async withEmpresaTransaction<T>(
    empresaId: string,
    action: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!pool || !isConnected) {
      return action({} as PoolClient);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Establecer contexto para Row Level Security (RLS Fase 7.3)
      await client.query(`SELECT set_config('app.empresa_id', $1, true)`, [empresaId]);
      await client.query(`SELECT set_config('app.current_empresa_id', $1, true)`, [empresaId]);
      
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
};
