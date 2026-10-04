import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/**
 * "¿Olvidaste tu contraseña?" — manda el enlace de recuperación.
 *
 * Responde `{ enviado: true }` exista o no la cuenta: decirlo distinto
 * sería confirmarle a cualquiera qué correos están registrados.
 *
 * **El enlace vuelve a `/restablecer-password/confirmar`**, que no
 * canjea nada: muestra un botón, y el `POST` de ese botón hace
 * `verifyOtp` con el token del correo. Antes iba al canje por código
 * (`/auth/callback/restablecer-password`), que tenía dos problemas, y
 * los dos se notaban con usuarios reales:
 *
 * - `@supabase/ssr` fuerza `flowType: 'pkce'`, así que el canje busca un
 *   verificador que quedó **como cookie en el navegador donde se pidió
 *   el enlace**. Pedir el reset en la computadora y abrir el correo en
 *   el teléfono no funcionaba.
 * - El enlace de `{{ .ConfirmationURL }}` es un `GET` que consume el
 *   token, y los escáneres de correo abren los enlaces antes que la
 *   persona. Un `POST` no lo dispara nadie más que quien aprieta.
 *
 * Con sesión puesta por ese `verifyOtp`, `restablecerPassword` fija la
 * contraseña nueva.
 *
 * **Depende de la plantilla «Reset Password» de Supabase**, que tiene
 * que apuntar a `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`.
 * Con la plantilla vieja el enlace llega con `?code=` y la pantalla
 * avisa que está incompleto.
 */

const esquemaEntrada = z.object({ identificadorAcceso: z.string().trim().email() });
export type SolicitarRecuperacionPasswordInput = z.infer<typeof esquemaEntrada>;
export interface SolicitarRecuperacionPasswordResultado {
  enviado: true;
}

const LIMITE_RECUPERACION = { maximoIntentos: 5, ventanaMs: 15 * 60 * 1000 };
const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const solicitarRecuperacionPassword: Servicio<
  SolicitarRecuperacionPasswordInput,
  SolicitarRecuperacionPasswordResultado
> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);

  const dentroDelLimite = await verificarLimite(
    `recuperacion:${datos.identificadorAcceso.toLowerCase()}`,
    LIMITE_RECUPERACION,
  );
  if (!dentroDelLimite) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'identificadorAcceso', problema: 'Demasiados intentos. Probá de nuevo más tarde.' },
    ]);
  }

  const supabase = await crearClienteServidor();
  await supabase.auth.resetPasswordForEmail(datos.identificadorAcceso, {
    // Sin query propia: el proveedor le agrega sus parámetros a esta
    // URL para armar el enlace de vuelta, y lo que ya traiga se mezcla
    // con eso de formas que dependen del flujo.
    redirectTo: `${URL_DEL_SITIO()}/restablecer-password/confirmar`,
  });

  return { enviado: true };
};
