import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Marca si la persona eligió "Recordarme" al ingresar (UC-01). Vive en
 * su propia cookie, no en la sesión: `@supabase/ssr` (0.12.5) fija el
 * `maxAge` de sus propias cookies de sesión al valor por default (400
 * días, el tope de Chrome) en el mismo objeto donde recibe
 * `cookieOptions` — un `maxAge` propio ahí se pisa y no tiene efecto.
 * El único punto donde SÍ se puede intervenir es acá abajo, en
 * `setAll`, que es nuestro propio código: si esta cookie dice que no
 * hay que recordar, cada cookie de sesión que Supabase pida escribir
 * —el login inicial y cada refresh de token después— se reescribe sin
 * `maxAge`/`expires`, así el navegador la trata como cookie de sesión
 * y la borra sola al cerrarse. Ausente (cuentas de antes de este
 * cambio) se comporta como si sí hubiera elegido recordar — el default
 * de siempre, para no desloguear a nadie de golpe.
 */
export const NOMBRE_COOKIE_RECORDAR = 'recordar_sesion';

/**
 * Cliente de Supabase ligado a la sesión de la petición actual (App
 * Router). Se crea uno nuevo por invocación porque lee y escribe las
 * cookies de esa petición puntual — nunca se reutiliza entre peticiones.
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (T3).
 */
export async function crearClienteServidor(opciones?: { recordarSesion?: boolean }) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas',
    );
  }

  const recordar =
    opciones?.recordarSesion ?? cookieStore.get(NOMBRE_COOKIE_RECORDAR)?.value !== '0';

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(
              name,
              value,
              recordar ? options : { ...options, maxAge: undefined, expires: undefined },
            );
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
