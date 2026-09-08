import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/**
 * Último paso de "¿Olvidaste tu contraseña?": fija la contraseña nueva.
 * Solo funciona con la sesión de recuperación que dejó puesta
 * `auth/callback` al canjear el enlace del correo — sin eso,
 * `updateUser` de Supabase falla porque no hay a quién actualizarle
 * la contraseña.
 */

const esquemaEntrada = z.object({
  password: z.string().min(8, 'La contraseña tiene que tener al menos 8 caracteres.'),
});

export type RestablecerPasswordInput = z.infer<typeof esquemaEntrada>;
export interface RestablecerPasswordResultado {
  actualizada: true;
}

export const restablecerPassword: Servicio<
  RestablecerPasswordInput,
  RestablecerPasswordResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: datos.password });

  if (error) {
    throw crearError('ERROR_INTERNO', { motivo: 'no se pudo actualizar la contraseña' });
  }

  return { actualizada: true };
};
