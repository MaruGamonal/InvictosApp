import { NextResponse, type NextRequest } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { construirContexto } from '@/lib/contexto';
import { completarRegistro } from '@/services/identidad/completarRegistro';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';

/**
 * Adonde vuelve la persona después de tocar cualquier enlace de acceso
 * que le mandamos por email — el de `iniciarRegistro` (UC-01) o el de
 * `solicitarVerificacionBasica` (UC-06). Los dos reutilizan el mismo
 * mecanismo: un enlace que, al abrirse, prueba que la persona controla
 * esa casilla. La metadata del enlace (`accion`) dice qué hacer una vez
 * que la sesión ya existe.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const siguiente = searchParams.get('next') ?? '/';

  if (code) {
    try {
      const supabase = await crearClienteServidor();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.user) {
        const metadata = data.user.user_metadata as {
          accion?: 'verificar_organizacion';
          organizacion_id?: string;
          nombre_visible?: string;
          accion_pendiente?: { tipo: string; datos: Record<string, unknown> } | null;
        };
        const contexto = await construirContexto();

        if (metadata.accion === 'verificar_organizacion' && metadata.organizacion_id) {
          await confirmarVerificacionBasica({ organizacionId: metadata.organizacion_id }, contexto);
          return NextResponse.redirect(`${origin}${siguiente}`);
        }

        await completarRegistro(
          {
            usuarioId: data.user.id,
            email: data.user.email ?? '',
            nombreVisible: metadata.nombre_visible ?? '',
            accionPendiente: metadata.accion_pendiente ?? undefined,
          },
          contexto,
        );

        return NextResponse.redirect(`${origin}${siguiente}`);
      }
    } catch {
      // cae al redirect de error de abajo
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
