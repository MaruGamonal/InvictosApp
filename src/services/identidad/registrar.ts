import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { obtenerClienteAdmin } from '@/lib/supabase/admin';

/**
 * UC-01 — Registrarse. Pide únicamente identificador de acceso (email) y
 * nombre visible (`06`, D-52); cualquier otro dato se pide después.
 *
 * Es passwordless: "una forma de autenticarse" (`02`, UC-01) es el enlace
 * que llega por email, no una contraseña — coherente con que el alta pide
 * solo dos campos. Por eso este servicio no crea todavía la fila de
 * `usuario`: eso pasa recién cuando la persona confirma el enlace, en
 * `completarRegistro`, que corre desde `src/app/auth/callback`.
 */

const esquemaEntrada = z.object({
  identificadorAcceso: z.string().trim().email(),
  nombreVisible: z.string().trim().min(1),
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

  const supabase = obtenerClienteAdmin();
  const { error } = await supabase.auth.signInWithOtp({
    email: datos.identificadorAcceso,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${URL_DEL_SITIO()}/auth/callback`,
      data: {
        nombre_visible: datos.nombreVisible,
        accion_pendiente: datos.accionPendiente ?? null,
      },
    },
  });

  if (error) {
    throw crearError('ERROR_INTERNO', { motivo: 'no se pudo enviar el enlace de acceso' });
  }

  return { enviado: true };
};
