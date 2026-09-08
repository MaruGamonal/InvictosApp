import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { crearClienteServidor } from '@/lib/supabase/servidor';

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
});

export type IniciarSesionInput = z.infer<typeof esquemaEntrada>;
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

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: datos.identificadorAcceso,
    password: datos.password,
  });

  if (error) {
    throw crearError('CREDENCIALES_INVALIDAS');
  }

  return { ingresado: true };
};
