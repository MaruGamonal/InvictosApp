import type { User } from '@supabase/supabase-js';
import { construirContexto } from '@/lib/contexto';
import { completarRegistro } from '@/services/identidad/completarRegistro';
import { confirmarEmailCuenta } from '@/services/identidad/confirmarEmailCuenta';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';

/**
 * Qué hacer una vez que la sesión ya existe. Lo comparten las dos
 * puertas de entrada —el canje por código (`/auth/callback`, los enlaces
 * ya enviados) y el canje por token (`/api/acceso/confirmar`)— para que
 * no se vayan separando con el tiempo.
 *
 * La intención viaja en la **ruta** del enlace y no en la metadata del
 * usuario. Antes estaba en la metadata, y eso hacía que dos flujos
 * fallaran en silencio: `signInWithOtp` aplica `options.data` solo
 * cuando **crea** una cuenta, y estos enlaces salen con
 * `shouldCreateUser: false` sobre cuentas que ya existen, así que la
 * metadata nunca llegaba. Confirmar la cuenta no marcaba nada —la
 * persona volvía del correo y la aplicación le seguía pidiendo que
 * confirmara— y verificar la organización tampoco hacía nada.
 *
 * La metadata se sigue leyendo para los enlaces que salieron antes de
 * este cambio.
 */

/** `organizacion/<uuid>` es la única intención con dato propio. */
export function leerIntencion(segmentos: string[] | undefined): {
  organizacionId?: string;
} {
  if (!segmentos || segmentos[0] !== 'organizacion') return {};
  return { organizacionId: segmentos[1] };
}

export async function completarAcceso(
  usuario: User,
  intencion: { organizacionId?: string } = {},
): Promise<void> {
  const metadata = usuario.user_metadata as {
    accion?: 'verificar_organizacion' | 'confirmar_cuenta';
    organizacion_id?: string;
    nombre_visible?: string;
    accion_pendiente?: { tipo: string; datos: Record<string, unknown> } | null;
  };
  const contexto = await construirContexto();

  // Primero, porque crea la fila de `usuario` si es un alta. Es
  // idempotente: en una confirmación o una verificación no hace nada.
  await completarRegistro(
    {
      usuarioId: usuario.id,
      email: usuario.email ?? '',
      nombreVisible: metadata.nombre_visible ?? usuario.email ?? '',
      accionPendiente: metadata.accion_pendiente ?? undefined,
    },
    contexto,
  );

  // Volver de cualquiera de estos enlaces *es* la prueba de que la
  // persona controla esa casilla, así que la cuenta queda confirmada sin
  // importar para cuál de los tres flujos se mandó el correo. Antes esto
  // dependía de una marca que no llegaba, y la cuenta quedaba sin
  // confirmar después de confirmarla.
  await confirmarEmailCuenta({ usuarioId: usuario.id }, contexto);

  const organizacionId =
    intencion.organizacionId ??
    (metadata.accion === 'verificar_organizacion' ? metadata.organizacion_id : undefined);

  // `confirmarVerificacionBasica` comprueba que quien volvió sea el
  // titular, así que que el id venga de la URL no alcanza para verificar
  // una organización ajena.
  if (organizacionId) {
    await confirmarVerificacionBasica({ organizacionId }, contexto);
  }
}
