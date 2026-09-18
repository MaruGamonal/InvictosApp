import { obtenerPool } from '@/db/cliente';
import { crearError } from './errores';
import type { Contexto } from './contexto';

/**
 * Reportado en vivo: pedir sumarse a un equipo, crear un equipo o crear
 * un torneo exigen la cuenta confirmada — todo lo demás (mirar, seguir,
 * iniciar sesión) sigue sin bloquear (`06`, D-90).
 *
 * No es una decisión sobre un vínculo (equipo/organización/torneo),
 * así que no vive en `permisos.ts`: es un estado de la cuenta misma,
 * previo a cualquier permiso.
 */
export async function verificarCuentaConfirmada(contexto: Contexto): Promise<void> {
  if (contexto.esSistema) return;
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ email_confirmado: boolean }>(
    'SELECT email_confirmado FROM usuario WHERE id = $1',
    [contexto.usuarioId],
  );
  if (rows[0] && !rows[0].email_confirmado) throw crearError('CUENTA_NO_CONFIRMADA');
}
