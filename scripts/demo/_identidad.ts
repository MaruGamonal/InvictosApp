import { randomUUID } from 'node:crypto';
import { obtenerPool } from '@/db/cliente';
import { contextoDeSistema, type Contexto } from '@/lib/contexto';
import { completarRegistro } from '@/services/identidad/completarRegistro';

/**
 * Identidad de los usuarios demo — la pieza que el seed viejo no tenía.
 *
 * Aquel insertaba filas en `usuario`/`perfil_deportivo` a mano con un
 * email aleatorio, así que los datos se veían en el sitio público pero
 * **no se podía iniciar sesión como nadie**: Supabase Auth no sabía de
 * esas cuentas. Acá la cuenta se crea de verdad con el Admin API y el
 * `id` que devuelve Supabase es el que va a `usuario.id`, que es
 * exactamente lo que hace `iniciarRegistro` en producción.
 *
 * Cuando no hay credenciales de Supabase en el entorno (una base
 * Postgres suelta, como la de desarrollo local) cae a insertar solo las
 * filas, avisando — sirve para mirar el sitio y para validar el
 * dataset, pero esas cuentas no pueden entrar.
 */

export const DOMINIO_DEMO = 'demo.invicta.com.ar';
/** Todas las cuentas demo comparten contraseña: no hay nada que proteger y se tipea una sola vez. */
export const PASSWORD_DEMO = 'InvictaDemo2026';

export function emailDemo(usuario: string): string {
  return `${usuario}@${DOMINIO_DEMO}`;
}

export function hayCredencialesDeAuth(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface UsuarioDemo {
  usuarioId: string;
  perfilId: string;
  email: string;
  nombre: string;
  contexto: Contexto;
}

/**
 * `completarRegistro` inserta `email_confirmado = false` (es lo correcto
 * en el alta real: la confirmación llega por correo). Acá se resuelve a
 * mano porque el seed no puede —ni debe— mandar mails: `confirmado:
 * false` es un estado que se pide a propósito, para probar el bloqueo de
 * `verificarCuentaConfirmada`.
 */
async function fijarConfirmacion(usuarioId: string, confirmado: boolean): Promise<void> {
  await obtenerPool().query('UPDATE usuario SET email_confirmado = $1 WHERE id = $2', [
    confirmado,
    usuarioId,
  ]);
}

async function crearCuentaEnAuth(email: string, nombre: string): Promise<string> {
  const { obtenerClienteAdmin } = await import('@/lib/supabase/admin');
  const admin = obtenerClienteAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD_DEMO,
    // Confirmado del lado de Supabase Auth para que el login no dependa
    // de un correo que nadie va a abrir. La bandera propia del producto
    // (`usuario.email_confirmado`) se fija aparte, más abajo.
    email_confirm: true,
    user_metadata: { nombre_visible: nombre },
  });
  if (error || !data.user) {
    throw new Error(`No se pudo crear la cuenta de Auth para ${email}: ${error?.message}`);
  }
  return data.user.id;
}

export async function crearUsuarioDemo(opciones: {
  usuario: string;
  nombre: string;
  fotoUrl?: string;
  /** `false` deja la cuenta sin confirmar, para probar el bloqueo de las acciones gateadas. */
  confirmado?: boolean;
}): Promise<UsuarioDemo> {
  const email = emailDemo(opciones.usuario);
  const usuarioId = hayCredencialesDeAuth()
    ? await crearCuentaEnAuth(email, opciones.nombre)
    : randomUUID();

  const { perfilDeportivoId } = await completarRegistro(
    { usuarioId, email, nombreVisible: opciones.nombre },
    contextoDeSistema(),
  );

  await fijarConfirmacion(usuarioId, opciones.confirmado ?? true);

  if (opciones.fotoUrl) {
    await obtenerPool().query('UPDATE perfil_deportivo SET foto_url = $1 WHERE id = $2', [
      opciones.fotoUrl,
      perfilDeportivoId,
    ]);
  }

  return {
    usuarioId,
    perfilId: perfilDeportivoId,
    email,
    nombre: opciones.nombre,
    contexto: { usuarioId, permisos: {}, esSistema: false },
  };
}
