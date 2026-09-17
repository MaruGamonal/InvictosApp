import { z } from 'zod';
import { cookies } from 'next/headers';
import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import {
  NOMBRE_COOKIE_MODO_INICIO,
  DURACION_MODO_INICIO_SEGUNDOS,
  type ModoInicio,
} from '@/lib/modoInicio';

const esquemaEntrada = z.object({ modo: z.enum(['jugador', 'organizador']) });
export type ActualizarModoInicioInput = z.infer<typeof esquemaEntrada>;

export interface ActualizarModoInicioResultado {
  modo: ModoInicio;
}

/**
 * Guarda qué modo (Jugador/Organizador) eligió ver en Inicio quien tiene
 * los dos roles — sin esto, cada visita nueva volvía siempre al modo por
 * defecto (Jugador), aunque la vez anterior hubiera elegido Organizador.
 */
export const actualizarModoInicio: Servicio<
  ActualizarModoInicioInput,
  ActualizarModoInicioResultado
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const cookieStore = await cookies();
  cookieStore.set(NOMBRE_COOKIE_MODO_INICIO, datos.modo, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: DURACION_MODO_INICIO_SEGUNDOS,
  });

  return { modo: datos.modo };
};
