import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { completarAcceso } from '../../../auth/_completarAcceso';

/** Los únicos tipos que emitimos; cualquier otro valor no se reenvía al proveedor. */
const TIPOS: EmailOtpType[] = ['magiclink', 'signup', 'email', 'invite'];

/**
 * Canjea por sesión el token de un enlace de acceso, desde el botón de
 * `/acceso/confirmar`. POST a propósito: el token sirve una sola vez y
 * los escáneres de correo abren los enlaces antes que la persona.
 *
 * `verifyOtp` y no el canje por código: estos enlaces los emite el
 * cliente admin, que no escribe cookies, así que el verificador que el
 * canje por código busca en el navegador no existió nunca. Con el token
 * del correo alcanza.
 */
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  const alError = (motivo: string) =>
    NextResponse.redirect(`${origin}/auth/error?motivo=${encodeURIComponent(motivo)}`, 303);

  const formulario = await request.formData();
  const token = formulario.get('token_hash');
  const tipoPedido = formulario.get('type');

  if (typeof token !== 'string' || !token) return alError('sin-token');

  const tipo = TIPOS.find((candidato) => candidato === tipoPedido) ?? 'magiclink';

  try {
    const supabase = await crearClienteServidor();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: token, type: tipo });

    if (error) return alError(error.code ?? error.name);
    if (!data.user) return alError('sin-usuario');

    await completarAcceso(data.user);

    // 303 para que el navegador siga el redirect con GET: con 302,
    // recargar reenvía el POST y reintenta un token ya usado.
    return NextResponse.redirect(`${origin}/inicio`, 303);
  } catch {
    return alError('excepcion');
  }
}
