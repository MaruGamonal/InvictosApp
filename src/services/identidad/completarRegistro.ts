import { z } from 'zod';
import type { PoolClient } from 'pg';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { ejecutarAccionPendiente } from '@/lib/accionesPendientes';

/**
 * Segunda mitad de UC-01: se invoca desde `src/app/auth/callback` cuando
 * Supabase confirma el enlace de acceso y la persona ya tiene sesión. Acá
 * es donde existen de verdad la cuenta y su perfil deportivo —no antes—,
 * porque hasta este momento la dirección de email no estaba confirmada.
 *
 * Crea `usuario` y `perfil_deportivo` **en el mismo movimiento** (`10`,
 * 4.1): toda cuenta tiene su identidad deportiva desde el día uno, para
 * que ninguna pantalla tenga que contemplar un estado intermedio de
 * "cuenta sin perfil". `usuarioId` es el id que Supabase Auth le asignó a
 * la persona — `usuario.id` lo espeja, no genera uno propio.
 *
 * Es idempotente: si la cuenta ya existe (un segundo click del enlace, un
 * login posterior), no la recrea.
 */

const esquemaEntrada = z.object({
  usuarioId: z.string().uuid(),
  email: z.string().email(),
  nombreVisible: z.string().trim().min(1),
  accionPendiente: z.object({ tipo: z.string(), datos: z.record(z.unknown()) }).optional(),
});

export type CompletarRegistroInput = z.infer<typeof esquemaEntrada>;
export interface CompletarRegistroResultado {
  usuarioId: string;
  perfilDeportivoId: string;
  yaExistia: boolean;
}

export const completarRegistro: Servicio<
  CompletarRegistroInput,
  CompletarRegistroResultado
> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();
  const cliente: PoolClient = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const existente = await cliente.query<{ id: string; perfil_deportivo_id: string }>(
      'SELECT id, perfil_deportivo_id FROM usuario WHERE id = $1',
      [datos.usuarioId],
    );

    let perfilDeportivoId: string;
    let yaExistia: boolean;

    if (existente.rows.length > 0) {
      yaExistia = true;
      perfilDeportivoId = existente.rows[0]!.perfil_deportivo_id;
    } else {
      yaExistia = false;

      await cliente.query(
        `INSERT INTO usuario (id, email, nombre_completo)
         VALUES ($1, $2, $3)`,
        [datos.usuarioId, datos.email, datos.nombreVisible],
      );

      const perfil = await cliente.query<{ id: string }>(
        `INSERT INTO perfil_deportivo (usuario_id, nombre_visible, estado_reclamo, creado_por_usuario_id)
         VALUES ($1, $2, 'claimed', $1)
         RETURNING id`,
        [datos.usuarioId, datos.nombreVisible],
      );
      perfilDeportivoId = perfil.rows[0]!.id;

      await cliente.query('UPDATE usuario SET perfil_deportivo_id = $1 WHERE id = $2', [
        perfilDeportivoId,
        datos.usuarioId,
      ]);
    }

    await cliente.query('COMMIT');

    if (!yaExistia && datos.accionPendiente) {
      await ejecutarAccionPendiente(datos.accionPendiente, datos.usuarioId);
    }

    return { usuarioId: datos.usuarioId, perfilDeportivoId, yaExistia };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
