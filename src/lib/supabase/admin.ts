import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase con la clave de servicio (bypassa RLS). Solo para
 * operaciones que la capa de servicios necesita hacer con privilegios que
 * una sesión de usuario no tiene — acá, enviar el enlace de acceso sin
 * pasar por el cliente público. Nunca se expone al navegador.
 */
let cliente: SupabaseClient | undefined;

export function obtenerClienteAdmin(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const claveDeServicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !claveDeServicio) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no están configuradas');
    }
    cliente = createClient(url, claveDeServicio, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cliente;
}
