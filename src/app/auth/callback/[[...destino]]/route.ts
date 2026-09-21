import { NextResponse, type NextRequest } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { construirContexto } from '@/lib/contexto';
import { completarRegistro } from '@/services/identidad/completarRegistro';
import { confirmarEmailCuenta } from '@/services/identidad/confirmarEmailCuenta';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';

/**
 * Adonde vuelve la persona después de tocar cualquier enlace de acceso
 * que le mandamos por email — el de `iniciarRegistro` (UC-01), el de
 * `solicitarVerificacionBasica` (UC-06) o el de
 * `enviarEmailConfirmacion`. Los tres reutilizan el mismo mecanismo: un
 * enlace que, al abrirse, prueba que la persona controla esa casilla.
 * La metadata del enlace (`accion`) dice qué hacer una vez que la
 * sesión ya existe.
 *
 * El destino final viaja en la **ruta**, no en la query
 * (`/auth/callback/restablecer-password`). Con `?next=` no llegaba: el
 * proveedor arma el enlace de vuelta agregándole sus propios parámetros
 * a la URL que le pasamos, y una URL que ya traía query se mezcla con
 * eso de formas que dependen del flujo. Un segmento de ruta no se mezcla
 * con nada y sobrevive el viaje de ida y vuelta entero.
 */

/**
 * `next` se sigue aceptando por los enlaces que ya salieron por correo
 * con la forma vieja, y se limita a rutas internas: un valor que empiece
 * con `//` lo lee el navegador como otro sitio, así que sería una puerta
 * para mandar gente a cualquier lado desde un enlace nuestro.
 */
function destinoDelEnlace(segmentos: string[] | undefined, next: string | null): string {
  if (segmentos && segmentos.length > 0) {
    return `/${segmentos.map(encodeURIComponent).join('/')}`;
  }
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ destino?: string[] }> },
) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const { destino } = await params;
  const siguiente = destinoDelEnlace(destino, searchParams.get('next'));

  if (code) {
    try {
      const supabase = await crearClienteServidor();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error && data.user) {
        const metadata = data.user.user_metadata as {
          accion?: 'verificar_organizacion' | 'confirmar_cuenta';
          organizacion_id?: string;
          nombre_visible?: string;
          accion_pendiente?: { tipo: string; datos: Record<string, unknown> } | null;
        };
        const contexto = await construirContexto();

        if (metadata.accion === 'verificar_organizacion' && metadata.organizacion_id) {
          await confirmarVerificacionBasica({ organizacionId: metadata.organizacion_id }, contexto);
          return NextResponse.redirect(`${origin}${siguiente}`);
        }

        if (metadata.accion === 'confirmar_cuenta') {
          await confirmarEmailCuenta({ usuarioId: data.user.id }, contexto);
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
