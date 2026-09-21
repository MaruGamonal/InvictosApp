import { z } from 'zod';
import { cookies } from 'next/headers';
import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { crearClienteServidor, NOMBRE_COOKIE_RECORDAR } from '@/lib/supabase/servidor';
import { contextoDeSistema } from '@/lib/contexto';
import { completarRegistro } from './completarRegistro';

/** Mismo tope que usa `@supabase/ssr` para sus propias cookies de sesión (400 días, el máximo de Chrome). */
const DURACION_RECORDAR_SEGUNDOS = 400 * 24 * 60 * 60;

/**
 * UC-01 (ingreso) — Inicia sesión con correo y contraseña. A diferencia
 * del resto de los servicios, este sí establece la sesión en el mismo
 * movimiento: `crearClienteServidor()` está atado a las cookies de la
 * petición actual, así que la llamada a `signInWithPassword` deja la
 * cookie de sesión puesta en la respuesta — el mismo mecanismo que ya
 * usa `src/app/auth/callback` al canjear un enlace.
 *
 * El límite de frecuencia es por intento fallido y exitoso combinados,
 * igual que en `registrar.ts` — es la defensa contra fuerza bruta.
 */

const esquemaEntrada = z.object({
  identificadorAcceso: z.string().trim().email(),
  password: z.string().min(1),
  /** UC-01 — "Recordarme": si no se manda, se recuerda (comportamiento de siempre). */
  recordarme: z.boolean().optional().default(true),
});

/** `z.input`, no `z.infer`: `recordarme` es opcional para quien llama (el default lo pone Zod). */
export type IniciarSesionInput = z.input<typeof esquemaEntrada>;
export interface IniciarSesionResultado {
  ingresado: true;
}

const LIMITE_INGRESO = { maximoIntentos: 8, ventanaMs: 15 * 60 * 1000 };

export const iniciarSesion: Servicio<IniciarSesionInput, IniciarSesionResultado> = async (
  input,
) => {
  const datos = validarEntrada(esquemaEntrada, input);

  const dentroDelLimite = verificarLimite(
    `ingreso:${datos.identificadorAcceso.toLowerCase()}`,
    LIMITE_INGRESO,
  );
  if (!dentroDelLimite) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'identificadorAcceso', problema: 'Demasiados intentos. Probá de nuevo más tarde.' },
    ]);
  }

  const supabase = await crearClienteServidor({ recordarSesion: datos.recordarme });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: datos.identificadorAcceso,
    password: datos.password,
  });

  if (error || !data.user) {
    throw crearError('CREDENCIALES_INVALIDAS');
  }

  // El alta son dos pasos —crear la cuenta en el proveedor y crear la
  // fila acá— y entre uno y otro se puede cortar: queda una cuenta con
  // la que se puede entrar y que la aplicación no conoce. Esa sesión
  // rompía cosas más adelante, cuando algo buscaba la fila y no la
  // encontraba. `completarRegistro` es idempotente, así que en el caso
  // normal esto no hace nada, y en el roto lo repara al entrar.
  await completarRegistro(
    {
      usuarioId: data.user.id,
      email: data.user.email ?? datos.identificadorAcceso,
      nombreVisible:
        (data.user.user_metadata as { nombre_visible?: string })?.nombre_visible ??
        data.user.email ??
        datos.identificadorAcceso,
    },
    contextoDeSistema(),
  );

  const cookieStore = await cookies();
  cookieStore.set(NOMBRE_COOKIE_RECORDAR, datos.recordarme ? '1' : '0', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    ...(datos.recordarme ? { maxAge: DURACION_RECORDAR_SEGUNDOS } : {}),
  });

  return { ingresado: true };
};
