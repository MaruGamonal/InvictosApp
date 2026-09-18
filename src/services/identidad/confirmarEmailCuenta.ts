import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';

/**
 * Segunda mitad de la confirmación de cuenta: `src/app/auth/callback`
 * la invoca cuando la persona vuelve del enlace de
 * `enviarEmailConfirmacion` con sesión válida — volver de ese enlace
 * *es* la prueba de que controla la casilla, mismo criterio que
 * `confirmarVerificacionBasica` para la organización.
 *
 * Idempotente: si ya estaba confirmada, no hace nada.
 */

const esquemaEntrada = z.object({ usuarioId: z.string().uuid() });
export type ConfirmarEmailCuentaInput = z.infer<typeof esquemaEntrada>;

export const confirmarEmailCuenta: Servicio<ConfirmarEmailCuentaInput, void> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();
  await pool.query('UPDATE usuario SET email_confirmado = true WHERE id = $1', [datos.usuarioId]);
};
