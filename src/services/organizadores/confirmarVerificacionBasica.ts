import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-06 — Confirma la verificación básica. Se invoca desde
 * `src/app/auth/callback` una vez que Supabase ya confirmó que la
 * persona controla la dirección de correo de acceso de la organización
 * (el "token" de `10`, 4.2 es el enlace que acaba de canjear).
 *
 * Verifica además que quien volvió con la sesión sea efectivamente el
 * titular de esa organización — defensa en profundidad si el enlace
 * llegara a reenviarse a otra persona.
 */

const esquemaEntrada = z.object({ organizacionId: z.string().uuid() });
export type ConfirmarVerificacionBasicaInput = z.infer<typeof esquemaEntrada>;

export const confirmarVerificacionBasica: Servicio<
  ConfirmarVerificacionBasicaInput,
  { nivelVerificacion: 'basic' }
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows } = await pool.query<{ usuario_titular_id: string }>(
    'SELECT usuario_titular_id FROM organizacion WHERE id = $1',
    [datos.organizacionId],
  );
  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');
  if (fila.usuario_titular_id !== contexto.usuarioId) throw crearError('SIN_PERMISO');

  await pool.query(
    `UPDATE organizacion SET nivel_verificacion = 'basic', fecha_verificacion = now() WHERE id = $1`,
    [datos.organizacionId],
  );

  return { nivelVerificacion: 'basic' };
};
