import * as Sentry from '@sentry/nextjs';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { enviarEmailConfirmacion } from '@/lib/emailConfirmacion';

/**
 * El botón "Reenviar enlace" del aviso de cuenta no confirmada
 * (`verificarCuentaConfirmada`). Reenvía al email de la propia sesión
 * — no recibe el email por parámetro, para que nadie pueda usarlo para
 * mandar correos a una casilla ajena.
 */

const LIMITE_REENVIO = { maximoIntentos: 3, ventanaMs: 15 * 60 * 1000 };

export const reenviarConfirmacion: Servicio<void, { enviado: true }> = async (_input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  if (!(await verificarLimite(`reenviar-confirmacion:${contexto.usuarioId}`, LIMITE_REENVIO))) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'email', problema: 'Demasiados intentos. Probá de nuevo más tarde.' },
    ]);
  }

  const pool = obtenerPool();
  const { rows } = await pool.query<{ email: string; email_confirmado: boolean }>(
    'SELECT email, email_confirmado FROM usuario WHERE id = $1',
    [contexto.usuarioId],
  );
  const usuario = rows[0];
  if (!usuario) throw crearError('NO_ENCONTRADO');
  if (usuario.email_confirmado) return { enviado: true };

  try {
    await enviarEmailConfirmacion(usuario.email);
  } catch (error) {
    // El caso más común no es una falla: Supabase no deja pedir otro
    // enlace al mismo correo hasta pasado un rato, y la app ya manda
    // uno al registrarse y otro al bloquear la acción. Tocar "Reenviar"
    // enseguida chocaba con ese límite y se mostraba como "Algo salió
    // mal de nuestro lado" (reportado en vivo). Es un rechazo con
    // explicación: el enlace ya está en camino.
    if (esLimiteDelProveedor(error)) {
      throw crearError('DATOS_INVALIDOS', [
        {
          campo: 'email',
          problema:
            'Ya te mandamos un enlace hace un momento: revisá tu correo, también en spam. Si no llegó, pedí otro en unos minutos.',
        },
      ]);
    }
    // `crearError` arma un error de aplicación, y `comoRespuestaHttp` no
    // reporta esos a Sentry: son casos de negocio esperados. Este no lo
    // es —es el proveedor de correo rechazando el envío, casi siempre por
    // su propio límite— y sin este `captureException` el motivo real no
    // quedaba en ningún lado: ni en pantalla (la respuesta es genérica, a
    // propósito) ni en Sentry. Un fallo que no se ve en ninguna parte es
    // un fallo que no se arregla.
    Sentry.captureException(error);
    throw crearError('ERROR_INTERNO', { motivo: 'no se pudo reenviar el correo de confirmación' });
  }

  return { enviado: true };
};

/**
 * Si el error es el límite de envíos de Supabase Auth: 429, o los
 * códigos y el texto con que lo anuncia ("For security purposes, you can
 * only request this after N seconds").
 */
export function esLimiteDelProveedor(error: unknown): boolean {
  const e = error as { status?: unknown; code?: unknown; message?: unknown } | null;
  if (!e) return false;
  if (e.status === 429) return true;
  if (typeof e.code === 'string' && /rate_limit/.test(e.code)) return true;
  return typeof e.message === 'string' && /security purposes|rate limit/i.test(e.message);
}
