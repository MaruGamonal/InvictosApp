import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { validarEntrada } from '@/lib/validacion';
import { esErrorDeAplicacion } from '@/lib/errores';
import { verificarPermisoTorneo } from '@/lib/permisos';

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerMiRolEnTorneoInput = z.infer<typeof esquemaEntrada>;

/**
 * ¿Puedo gestionar este torneo? Sin sesión, sin vínculo, o torneo
 * inexistente, `{ puedeGestionar: false }` — no es un error, es la
 * respuesta correcta para alguien que solo está mirando la ficha
 * pública (D-04b). Alimenta la visibilidad del enlace "Gestionar
 * torneo"; el permiso real lo vuelve a verificar cada servicio de
 * `/gestionar`.
 */
export const obtenerMiRolEnTorneo: Servicio<
  ObtenerMiRolEnTorneoInput,
  { puedeGestionar: boolean }
> = async (input, contexto) => {
  if (!contexto.usuarioId) return { puedeGestionar: false };
  const datos = validarEntrada(esquemaEntrada, input);

  try {
    await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');
    return { puedeGestionar: true };
  } catch (error) {
    if (esErrorDeAplicacion(error)) return { puedeGestionar: false };
    throw error;
  }
};
