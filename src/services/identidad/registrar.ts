import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerClienteAdmin } from '@/lib/supabase/admin';
import { contextoDeSistema } from '@/lib/contexto';
import { completarRegistro } from './completarRegistro';
import { enviarEmailConfirmacion } from './_enviarEmailConfirmacion';

/**
 * UC-01 — Registrarse. Pide identificador de acceso (email), nombre
 * visible y contraseña (`06`, D-52: registro mínimo).
 *
 * La cuenta queda lista al toque, sin esperar a que confirmen el correo:
 * `FLOWS.md` (Flujo 1, pasos 2-3) es explícito — "No se pide validar el
 * correo acá" — y D-90 ya había establecido que ni siquiera la ciudad se
 * pide en el registro. **Reportado en vivo, esto se ajustó**: pedir
 * sumarse a un equipo, crear un equipo o crear un torneo sí exigen
 * ahora la cuenta confirmada (`verificarCuentaConfirmada`) — todo lo
 * demás (mirar, seguir, iniciar sesión) sigue sin bloquear.
 *
 * Por eso esto usa el Admin API (`auth.admin.createUser` con
 * `email_confirm: true`) en vez de `auth.signUp`: crea la cuenta ya
 * confirmada **del lado de Supabase Auth** (para que el inicio de
 * sesión de acá abajo nunca dependa de si Supabase exige confirmar
 * antes de dejar entrar), completa `usuario` + `perfil_deportivo` en el
 * mismo movimiento (reusa `completarRegistro`, que inserta
 * `email_confirmado = false` — nuestra propia bandera, no la de
 * Supabase) y después inicia sesión con el cliente atado a la request
 * para que la cookie quede puesta antes de responder. El enlace que
 * confirma esa bandera propia se manda aparte, sin bloquear la
 * respuesta si el envío falla — se puede reenviar después.
 */

const esquemaEntrada = z.object({
  identificadorAcceso: z.string().trim().email(),
  nombreVisible: z.string().trim().min(1),
  password: z.string().min(8, 'La contraseña tiene que tener al menos 8 caracteres.'),
  accionPendiente: z.object({ tipo: z.string(), datos: z.record(z.unknown()) }).optional(),
});

export type IniciarRegistroInput = z.infer<typeof esquemaEntrada>;
export interface IniciarRegistroResultado {
  cuentaCreada: true;
}

const LIMITE_REGISTRO = { maximoIntentos: 5, ventanaMs: 15 * 60 * 1000 };

export const iniciarRegistro: Servicio<IniciarRegistroInput, IniciarRegistroResultado> = async (
  input,
) => {
  const datos = validarEntrada(esquemaEntrada, input);

  const dentroDelLimite = verificarLimite(
    `registro:${datos.identificadorAcceso.toLowerCase()}`,
    LIMITE_REGISTRO,
  );
  if (!dentroDelLimite) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'identificadorAcceso', problema: 'Demasiados intentos. Probá de nuevo más tarde.' },
    ]);
  }

  const admin = obtenerClienteAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: datos.identificadorAcceso,
    password: datos.password,
    email_confirm: true,
    user_metadata: { nombre_visible: datos.nombreVisible },
  });

  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes('already')) {
      throw crearError('CORREO_YA_REGISTRADO');
    }
    throw crearError('ERROR_INTERNO', { motivo: 'no se pudo crear la cuenta' });
  }

  await completarRegistro(
    {
      usuarioId: data.user.id,
      email: datos.identificadorAcceso,
      nombreVisible: datos.nombreVisible,
      accionPendiente: datos.accionPendiente,
    },
    contextoDeSistema(),
  );

  const supabase = await crearClienteServidor();
  const { error: errorIngreso } = await supabase.auth.signInWithPassword({
    email: datos.identificadorAcceso,
    password: datos.password,
  });
  if (errorIngreso) {
    throw crearError('ERROR_INTERNO', {
      motivo: 'la cuenta se creó pero no se pudo iniciar sesión',
    });
  }

  try {
    await enviarEmailConfirmacion(datos.identificadorAcceso);
  } catch {
    // La cuenta ya se creó y la sesión ya quedó puesta — el enlace se
    // puede reenviar después desde el aviso de "cuenta no confirmada".
  }

  return { cuentaCreada: true };
};
