import { obtenerPool } from '@/db/cliente';
import type { Servicio } from '@/lib/servicio';

export interface ResultadoVerificacion {
  conectado: boolean;
}

/**
 * Servicio de ejemplo del ticket T1: demuestra la firma común
 * `(input, contexto) -> resultado` y que `services/` solo depende de
 * `db/` y `lib/`, nunca de `app/`.
 */
export const verificarConexionBaseDeDatos: Servicio<void, ResultadoVerificacion> = async () => {
  const pool = obtenerPool();
  await pool.query('SELECT 1');
  return { conectado: true };
};
