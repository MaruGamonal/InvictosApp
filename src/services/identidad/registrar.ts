import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/**
 * UC-01 — Registrarse. Pide identificador de acceso (email), nombre
 * visible y contraseña (`06`, D-52: registro mínimo — cualquier otro
 * dato se pide después).
 *
 * Con contraseña: la cuenta se crea acá mismo (`supabase.auth.signUp`),
 * pero queda sin confirmar hasta que la persona toca el enlace que le
 * llega por correo — por eso este servicio tampoco escribe todavía la
 * fila de `usuario` propia: eso pasa recién en `completarRegistro`,
 * que corre desde `src/app/auth/callback` cuando el enlace se confirma.
 *
 * `next=/cuenta-creada`: sin esto, `auth/callback` manda por default a
 * `/` (la Bienvenida) — una pantalla pensada para quien todavía no
 * tiene sesión, así que sería un callejón sin salida para alguien que
 * recién confirmó la cuenta. `/cuenta-creada` es el siguiente paso del
 * diseño (`Flujo Registro y primer torneo.dc.html`, pantalla 3), y de
 * ahí el botón "Empezar" sigue a `/torneos`, que pide la ciudad si hace
 * falta (D-90) y ya muestra los torneos.
 */

const esquemaEntrada = z.object({
  identificadorAcceso: z.string().trim().email(),
  nombreVisible: z.string().trim().min(1),
  password: z.string().min(8, 'La contraseña tiene que tener al menos 8 caracteres.'),
  accionPendiente: z.object({ tipo: z.string(), datos: z.record(z.unknown()) }).optional(),
});

export type IniciarRegistroInput = z.infer<typeof esquemaEntrada>;
export interface IniciarRegistroResultado {
  enviado: true;
}

const LIMITE_REGISTRO = { maximoIntentos: 5, ventanaMs: 15 * 60 * 1000 };
const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signUp({
    email: datos.identificadorAcceso,
    password: datos.password,
    options: {
      emailRedirectTo: `${URL_DEL_SITIO()}/auth/callback?next=/cuenta-creada`,
      data: {
        nombre_visible: datos.nombreVisible,
        accion_pendiente: datos.accionPendiente ?? null,
      },
    },
  });

  if (error) {
    throw crearError('ERROR_INTERNO', { motivo: 'no se pudo crear la cuenta' });
  }

  return { enviado: true };
};
