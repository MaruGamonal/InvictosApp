import { NextResponse, type NextRequest } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/**
 * Canjea el token del enlace de recuperación por una sesión, desde el
 * botón de `/restablecer-password/confirmar`. Es POST a propósito: el
 * token sirve una sola vez y los escáneres de correo abren los enlaces
 * (GET) antes que la persona, gastándolo. Un POST no lo dispara nadie
 * más que quien aprieta el botón.
 *
 * Usa `verifyOtp` y no el canje por código: aquel necesita una cookie
 * que el navegador guardó cuando se pidió el enlace, así que pedirlo en
 * la computadora y abrirlo en el teléfono no funcionaba. Con el token
 * del correo alcanza, venga de donde venga.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const formulario = await request.formData();
  const token = formulario.get('token_hash');
  const tipo = formulario.get('type');

  if (typeof token !== 'string' || !token) {
    return NextResponse.redirect(`${origin}/auth/error?motivo=sin-token`, 303);
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: tipo === 'email' ? 'email' : 'recovery',
  });

  // 303 para que el navegador siga el redirect con GET y no reenvíe el
  // POST — si no, recargar la pantalla reintentaría un token ya usado.
  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?motivo=${encodeURIComponent(error.code ?? error.name)}`,
      303,
    );
  }

  return NextResponse.redirect(`${origin}/restablecer-password`, 303);
}
