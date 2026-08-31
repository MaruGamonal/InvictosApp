import { Pool } from 'pg';

/**
 * Conexión a PostgreSQL (Supabase) por variable de entorno (`10`, 2.1).
 * Un único pool por proceso; nunca se crea uno por invocación de servicio.
 */
let pool: Pool | undefined;

export function obtenerPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no está configurada');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}
