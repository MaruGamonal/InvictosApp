import * as Sentry from '@sentry/nextjs';
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
 * el botón "Reenviar enlace" del aviso para recibirlo. Un fallo al
 * mandar el correo nunca rompe el bloqueo en sí: la persona igual puede
 * reintentar desde el botón.
 *
 * Reportado en vivo (tercera vuelta): ese reenvío automático comparte la
 * cuota del botón —a propósito, para que tocar la acción bloqueada en
 * bucle no sea una forma de saltarse el límite—, pero con la misma
 * cantidad de intentos se la comía entera: tres toques a "Pedir
 * sumarme" dejaban el botón "Reenviar enlace" muerto antes de que
 * alguien lo tocara por primera vez, y el aviso respondía "No pudimos
 * reenviarlo. Probá de nuevo" sin decir que el problema era justamente
 * haber probado de nuevo. Así que el automático tiene ahora su propia
 * cuota, de un envío por ventana: alcanza para lo que se buscaba (el
 * correo llega sin buscar el botón) y le deja el resto al botón. Y como
 * el automático sigue consumiendo la cuota compartida cuando dispara,
 * el bucle manda menos correos que antes, no más.
 */
const LIMITE_REENVIO_AUTOMATICO = { maximoIntentos: 1, ventanaMs: 15 * 60 * 1000 };
const LIMITE_REENVIO_COMPARTIDO = { maximoIntentos: 3, ventanaMs: 15 * 60 * 1000 };

export async function verificarCuentaConfirmada(contexto: Contexto): Promise<void> {
  if (contexto.esSistema) return;
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ email: string; email_confirmado: boolean }>(
    'SELECT email, email_confirmado FROM usuario WHERE id = $1',
    [contexto.usuarioId],
  );
  const usuario = rows[0];

  // Sin fila no se deja pasar. Antes este caso caía junto con "ya está
  // confirmada" en un mismo `return`, así que una sesión cuya cuenta no
  // existe en la base —un registro que se cortó entre crear la cuenta en
  // el proveedor y crear la fila— se saltaba el bloqueo entero. Un
  // control que no puede comprobar lo que controla tiene que negar, no
  // permitir.
  if (!usuario) throw crearError('NO_AUTENTICADO');
  if (usuario.email_confirmado) return;

  // El `&&` corta: agotada la cuota del automático, la compartida ni se
  // toca, y el botón conserva sus intentos.
  if (
    (await verificarLimite(
      `reenviar-confirmacion-auto:${contexto.usuarioId}`,
      LIMITE_REENVIO_AUTOMATICO,
    )) &&
    (await verificarLimite(
      `reenviar-confirmacion:${contexto.usuarioId}`,
      LIMITE_REENVIO_COMPARTIDO,
    ))
  ) {
    try {
      await enviarEmailConfirmacion(usuario.email);
    } catch (error) {
      // No romper el bloqueo por esto — el aviso en pantalla igual ofrece
      // "Reenviar enlace". Pero tampoco tragárselo en silencio: acá no hay
      // nadie mirando una respuesta, así que si el proveedor de correo
      // deja de mandar, Sentry es el único lugar donde se va a ver.
      Sentry.captureException(error);
    }
  }

  throw crearError('CUENTA_NO_CONFIRMADA');
}
