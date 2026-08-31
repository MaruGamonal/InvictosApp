import { NextResponse, type NextRequest } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { construirContexto } from '@/lib/contexto';
import { completarRegistro } from '@/services/identidad/completarRegistro';

/**
 * Adonde vuelve la persona después de tocar el enlace de acceso que le
 * mandó `iniciarRegistro` (o un ingreso posterior). Acá es donde la
 * sesión pasa a existir de verdad, y por eso es también donde se
 * completa UC-01: crear `usuario` y `perfil_deportivo` recién ahora que
 * el email quedó confirmado.
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
          nombre_visible?: string;
          accion_pendiente?: { tipo: string; datos: Record<string, unknown> } | null;
        };

        await completarRegistro(
          {
            usuarioId: data.user.id,
            email: data.user.email ?? '',
            nombreVisible: metadata.nombre_visible ?? '',
            accionPendiente: metadata.accion_pendiente ?? undefined,
          },
          await construirContexto(),
        );

        return NextResponse.redirect(`${origin}${siguiente}`);
      }
    } catch {
      // cae al redirect de error de abajo
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
