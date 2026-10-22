#!/usr/bin/env node
/**
 * Un doble de GoTrue para la suite de punta a punta.
 *
 * **Por qué existe.** Las pruebas con sesión eran el agujero más grande
 * de la verificación: todo lo que exige estar logueado —la gestión de
 * un torneo, el panel de organizador, el plantel de un equipo— no lo
 * tocaba nunca un navegador. El crash de `/gestionar/configuracion` en
 * producción fue exactamente eso: un `Set` exportado desde un módulo
 * cliente, invisible para los tipos, para el build y para las pruebas
 * unitarias. Sólo lo agarraba abrir la pantalla.
 *
 * **Por qué así y no de otra forma.** La alternativa fácil era poner en
 * el código de producción una puerta —"si tal variable de entorno está,
 * saltearse la sesión"—. Eso es justo la clase de atajo que después
 * queda, y una puerta a la sesión en producción no es un atajo
 * cualquiera. La otra alternativa, un proyecto de Supabase de pruebas,
 * necesita credenciales que este entorno no tiene.
 *
 * Entonces: el producto no se toca. Lo que cambia es a dónde apunta
 * `NEXT_PUBLIC_SUPABASE_URL` cuando corre la suite. `obtenerUsuarioIdDeSesion`
 * llama a `supabase.auth.getUser()`, que sale a la red a
 * `GET /auth/v1/user` con el token de la cookie; esto responde eso y
 * nada más. El código que decide quién sos es el mismo que en
 * producción, con el mismo cliente y la misma cookie: lo único falso es
 * el servidor del otro lado.
 *
 * El token no se firma ni se valida. Es un doble de prueba: lleva el
 * `usuario_id` adentro y este servidor lo devuelve. Firmar de verdad no
 * agregaría ninguna garantía sobre el producto —que es lo que estamos
 * probando— y sí un criptosistema de mentira que mantener.
 */
import { createServer } from 'node:http';

const PUERTO = Number(process.env.PUERTO_GOTRUE_FALSO ?? 3101);

/** El `sub` que el token lleva adentro, sin verificar nada. */
function usuarioDelToken(token) {
  const partes = token.split('.');
  if (partes.length < 2) return null;
  try {
    const carga = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    return typeof carga.sub === 'string' ? carga.sub : null;
  } catch {
    return null;
  }
}

function usuarioComoGoTrue(id) {
  const ahora = new Date().toISOString();
  return {
    id,
    aud: 'authenticated',
    role: 'authenticated',
    email: `${id}@e2e.invalid`,
    email_confirmed_at: ahora,
    confirmed_at: ahora,
    last_sign_in_at: ahora,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: ahora,
    updated_at: ahora,
    is_anonymous: false,
  };
}

const servidor = createServer((peticion, respuesta) => {
  const url = new URL(peticion.url, `http://127.0.0.1:${PUERTO}`);

  const responder = (codigo, cuerpo) => {
    respuesta.writeHead(codigo, { 'content-type': 'application/json' });
    respuesta.end(JSON.stringify(cuerpo));
  };

  // Para que el `webServer` de Playwright sepa que ya está arriba.
  if (url.pathname === '/salud') return responder(200, { ok: true });

  if (url.pathname === '/auth/v1/user' && peticion.method === 'GET') {
    const autorizacion = peticion.headers.authorization ?? '';
    const token = autorizacion.replace(/^Bearer\s+/i, '');
    const usuarioId = usuarioDelToken(token);
    if (!usuarioId) {
      return responder(401, { code: 401, error_code: 'bad_jwt', msg: 'invalid claim' });
    }
    return responder(200, usuarioComoGoTrue(usuarioId));
  }

  // Un refresh no debería pasar —las sesiones de la suite vencen lejos—
  // pero si pasa, que no cuelgue: devuelve la misma sesión.
  if (url.pathname === '/auth/v1/token' && peticion.method === 'POST') {
    return responder(400, { code: 400, error_code: 'refresh_token_not_found', msg: 'no refresh' });
  }

  responder(404, { msg: `sin ruta falsa para ${peticion.method} ${url.pathname}` });
});

servidor.listen(PUERTO, '127.0.0.1', () => {
  console.log(`[gotrue-falso] escuchando en http://127.0.0.1:${PUERTO}`);
});
