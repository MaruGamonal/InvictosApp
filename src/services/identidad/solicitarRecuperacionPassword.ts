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
 * sería confirmarle a cualquiera qué correos están registrados. El
 * enlace vuelve a `auth/callback?next=/restablecer-password`, que ya
 * sabe canjear el código por una sesión — ahí sí, con sesión puesta,
 * `restablecerPassword` puede fijar la contraseña nueva.
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

  const dentroDelLimite = verificarLimite(
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
    redirectTo: `${URL_DEL_SITIO()}/auth/callback?next=/restablecer-password`,
  });

  return { enviado: true };
};
