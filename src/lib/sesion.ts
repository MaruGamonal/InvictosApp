import { crearClienteServidor } from './supabase/servidor';

/**
 * Resuelve el `usuario_id` de la sesión actual, en el servidor. Nunca se
 * recibe del cliente (`10`, 2.2). Usa `getUser()` —no `getSession()`— porque
 * revalida contra el servidor de Supabase Auth en vez de confiar en lo que
 * ya esté en la cookie.
 *
 * Devuelve `null` cuando no hay sesión: es un estado válido, no un error
 * (`06`, D-04b) — la mayoría del contenido de este producto se sirve así.
 */
export async function obtenerUsuarioIdDeSesion(): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
