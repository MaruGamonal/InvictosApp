import type { BrowserContext } from '@playwright/test';

/**
 * Darle sesión a un navegador de la suite, sin pasar por la pantalla de
 * ingreso.
 *
 * **Lo que se simula y lo que no.** No se simula la autenticación del
 * producto: el código que resuelve quién sos —`obtenerUsuarioIdDeSesion`,
 * `construirContexto`, y cada `verificarPermiso*` abajo— es exactamente
 * el de producción. Lo único reemplazado es el servidor de GoTrue al
 * que ese código le pregunta, por `_gotrueFalso.mjs`. Acá se escribe la
 * cookie que `@supabase/ssr` escribiría tras un login real.
 *
 * Lo que **no** se hace es abrirle una puerta al código de producción
 * para saltearse la sesión en pruebas. Eso es exactamente la clase de
 * atajo que después queda, y encima en el lugar donde menos conviene.
 *
 * **Por qué `sb-127-auth-token`.** `supabase-js` deriva el nombre de la
 * cookie del host de `NEXT_PUBLIC_SUPABASE_URL`:
 * `sb-${hostname.split('.')[0]}-auth-token`. Con el doble en
 * `http://127.0.0.1:<puerto>`, eso da `sb-127-auth-token`. Si algún día
 * el doble cambia de host, este nombre cambia con él y las pruebas
 * empiezan a correr sin sesión —sin fallar en el acto—, así que
 * `iniciarSesion` verifica que la sesión haya quedado puesta.
 */

const MAX_CHUNK = 3180;

function base64url(texto: string): string {
  return Buffer.from(texto, 'utf8').toString('base64url');
}

/**
 * Un access token con la forma de un JWT. No está firmado y no hace
 * falta: el doble lee el `sub` y responde. Firmarlo de verdad no
 * agregaría ninguna garantía sobre el producto y sí un criptosistema
 * de mentira que mantener.
 */
function tokenDeAcceso(usuarioId: string, vence: number): string {
  const cabecera = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const carga = base64url(
    JSON.stringify({
      sub: usuarioId,
      aud: 'authenticated',
      role: 'authenticated',
      exp: vence,
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  return `${cabecera}.${carga}.falso`;
}

export function nombreDeCookieDeSesion(urlDeSupabase: string): string {
  const host = new URL(urlDeSupabase).hostname;
  return `sb-${host.split('.')[0]}-auth-token`;
}

/** Parte el valor igual que `@supabase/ssr` cuando no entra en una cookie. */
function enPedazos(nombre: string, valor: string): Array<{ name: string; value: string }> {
  if (valor.length <= MAX_CHUNK) return [{ name: nombre, value: valor }];
  const pedazos: Array<{ name: string; value: string }> = [];
  for (let i = 0; i * MAX_CHUNK < valor.length; i += 1) {
    pedazos.push({
      name: `${nombre}.${i}`,
      value: valor.slice(i * MAX_CHUNK, (i + 1) * MAX_CHUNK),
    });
  }
  return pedazos;
}

export interface OpcionesDeSesion {
  /** De dónde sale el nombre de la cookie. Por defecto, el doble de la suite. */
  urlDeSupabase?: string;
  /** El origen del sitio, para el dominio de la cookie. */
  baseUrl: string;
}

/**
 * Deja al contexto del navegador con la sesión de `usuarioId` puesta.
 *
 * Verifica que haya quedado: una cookie con el nombre equivocado no
 * rompe nada —la aplicación se sirve igual, sin sesión— y entonces las
 * pruebas de pantallas con sesión pasarían por redirección a
 * `/ingresar` en vez de por lo que dicen probar.
 */
export async function iniciarSesion(
  contexto: BrowserContext,
  usuarioId: string,
  opciones: OpcionesDeSesion,
): Promise<void> {
  const urlDeSupabase =
    opciones.urlDeSupabase ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:3101';
  const vence = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

  const sesion = {
    access_token: tokenDeAcceso(usuarioId, vence),
    refresh_token: `refresh-falso-${usuarioId}`,
    expires_in: 60 * 60 * 24,
    expires_at: vence,
    token_type: 'bearer',
    user: {
      id: usuarioId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${usuarioId}@e2e.invalid`,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };

  const nombre = nombreDeCookieDeSesion(urlDeSupabase);
  const valor = `base64-${base64url(JSON.stringify(sesion))}`;
  const { hostname } = new URL(opciones.baseUrl);

  await contexto.addCookies(
    enPedazos(nombre, valor).map((pedazo) => ({
      ...pedazo,
      domain: hostname,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
      expires: vence,
    })),
  );
}
