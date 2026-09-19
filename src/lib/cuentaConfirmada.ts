import { obtenerPool } from '@/db/cliente';
import { crearError } from './errores';
import type { Contexto } from './contexto';
import { verificarLimite } from './limiteFrecuencia';
import { enviarEmailConfirmacion } from './emailConfirmacion';

/**
 * Reportado en vivo: pedir sumarse a un equipo, crear un equipo o crear
 * un torneo exigen la cuenta confirmada — todo lo demás (mirar, seguir,
 * iniciar sesión) sigue sin bloquear (`06`, D-90).
 *
 * No es una decisión sobre un vínculo (equipo/organización/torneo),
 * así que no vive en `permisos.ts`: es un estado de la cuenta misma,
 * previo a cualquier permiso.
 *
 * Reportado en vivo (segunda vuelta): al bloquear, reenvía el enlace de
 * confirmación en el momento — no hace falta que la persona encuentre
 * el botón "Reenviar enlace" del aviso para recibirlo. Comparte la
 * misma clave y el mismo límite de `reenviarConfirmacion.ts` (el botón)
 * para que intentar la acción bloqueada en bucle no sea una forma de
 * saltarse ese límite. Un fallo al mandar el correo nunca rompe el
 * bloqueo en sí: la persona igual puede reintentar desde el botón.
 */
const LIMITE_REENVIO_AUTOMATICO = { maximoIntentos: 3, ventanaMs: 15 * 60 * 1000 };

export async function verificarCuentaConfirmada(contexto: Contexto): Promise<void> {
  if (contexto.esSistema) return;
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ email: string; email_confirmado: boolean }>(
    'SELECT email, email_confirmado FROM usuario WHERE id = $1',
    [contexto.usuarioId],
  );
  const usuario = rows[0];
  if (!usuario || usuario.email_confirmado) return;

  if (verificarLimite(`reenviar-confirmacion:${contexto.usuarioId}`, LIMITE_REENVIO_AUTOMATICO)) {
    try {
      await enviarEmailConfirmacion(usuario.email);
    } catch {
      // No romper el bloqueo por esto — el aviso en pantalla igual ofrece "Reenviar enlace".
    }
  }

  throw crearError('CUENTA_NO_CONFIRMADA');
}
