import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheTorneo } from '@/lib/cache';

/**
 * Sacar un torneo publicado de las búsquedas, o volver a ponerlo
 * (`06`, D-21b).
 *
 * **Por qué, además de `despublicarTorneo`.** Volver a borrador sólo se
 * puede antes de que se anote nadie. Un torneo que ya tiene equipos y
 * que el organizador no quiere en el descubrimiento —un torneo cerrado
 * entre conocidos, uno de prueba que quedó con un equipo adentro— no
 * tenía ninguna salida: o seguía apareciendo o había que cancelarlo.
 *
 * Esto no le saca nada a nadie: `unlisted` sigue sirviendo la ficha
 * completa por link directo, los equipos inscriptos lo siguen viendo y
 * el torneo se sigue jugando. Lo único que cambia es que deja de
 * aparecer en las búsquedas.
 *
 * Volver a `public` exige la organización verificada, la misma regla
 * con la que `publicarTorneo` decide la visibilidad inicial (D-51): si
 * no, esto sería la puerta de atrás para saltearse la verificación.
 */

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  visibilidad: z.enum(['public', 'unlisted']),
});
export type CambiarVisibilidadTorneoInput = z.infer<typeof esquemaEntrada>;

export const cambiarVisibilidadTorneo: Servicio<
  CambiarVisibilidadTorneoInput,
  { visibilidad: 'public' | 'unlisted' }
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows } = await pool.query<{
    estado: string;
    nivel_verificacion: 'unverified' | 'basic' | 'trusted';
  }>(
    `SELECT t.estado, o.nivel_verificacion
     FROM torneo t JOIN organizacion o ON o.id = t.organizacion_id
     WHERE t.id = $1`,
    [datos.torneoId],
  );
  const torneo = rows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');

  // Un borrador no tiene visibilidad que elegir: no se descubre y punto,
  // y al publicarse la decide `publicarTorneo`.
  if (torneo.estado === 'draft') throw crearError('TRANSICION_NO_PERMITIDA');

  if (datos.visibilidad === 'public' && torneo.nivel_verificacion === 'unverified') {
    throw crearError('ORGANIZACION_NO_VERIFICADA');
  }

  await pool.query('UPDATE torneo SET visibilidad = $1, version = version + 1 WHERE id = $2', [
    datos.visibilidad,
    datos.torneoId,
  ]);

  invalidarCacheTorneo(datos.torneoId);
  return { visibilidad: datos.visibilidad };
};
