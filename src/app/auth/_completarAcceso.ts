import type { User } from '@supabase/supabase-js';
import { construirContexto } from '@/lib/contexto';
import { completarRegistro } from '@/services/identidad/completarRegistro';
import { confirmarEmailCuenta } from '@/services/identidad/confirmarEmailCuenta';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';

/**
 * Qué hacer una vez que la sesión ya existe, según para qué se mandó el
 * enlace. La metadata (`accion`) viaja con el usuario, así que no
 * depende de por dónde entró: sirve igual para el canje por código
 * (`/auth/callback`, los enlaces viejos) que para el canje por token
 * (`/api/acceso/confirmar`, los nuevos). Está acá afuera justamente para
 * que las dos puertas hagan lo mismo y no se vayan separando con el
 * tiempo.
 */
export async function completarAcceso(usuario: User): Promise<void> {
  const metadata = usuario.user_metadata as {
    accion?: 'verificar_organizacion' | 'confirmar_cuenta';
    organizacion_id?: string;
    nombre_visible?: string;
    accion_pendiente?: { tipo: string; datos: Record<string, unknown> } | null;
  };
  const contexto = await construirContexto();

  if (metadata.accion === 'verificar_organizacion' && metadata.organizacion_id) {
    await confirmarVerificacionBasica({ organizacionId: metadata.organizacion_id }, contexto);
    return;
  }

  if (metadata.accion === 'confirmar_cuenta') {
    await confirmarEmailCuenta({ usuarioId: usuario.id }, contexto);
    return;
  }

  await completarRegistro(
    {
      usuarioId: usuario.id,
      email: usuario.email ?? '',
      nombreVisible: metadata.nombre_visible ?? '',
      accionPendiente: metadata.accion_pendiente ?? undefined,
    },
    contexto,
  );
}
