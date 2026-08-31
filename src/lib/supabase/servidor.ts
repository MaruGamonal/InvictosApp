import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente de Supabase ligado a la sesión de la petición actual (App
 * Router). Se crea uno nuevo por invocación porque lee y escribe las
 * cookies de esa petición puntual — nunca se reutiliza entre peticiones.
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (T3).
 */
export async function crearClienteServidor() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas',
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Se llama también desde Server Components, que no pueden escribir
          // cookies. Es inofensivo: la sesión se refresca igual en la
          // próxima petición que sí pueda hacerlo (Route Handler o acción).
        }
      },
    },
  });
}
