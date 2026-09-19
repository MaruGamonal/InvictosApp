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

  if (!verificarLimite(`reenviar-confirmacion:${contexto.usuarioId}`, LIMITE_REENVIO)) {
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
  } catch {
    throw crearError('ERROR_INTERNO', { motivo: 'no se pudo reenviar el correo de confirmación' });
  }

  return { enviado: true };
};
