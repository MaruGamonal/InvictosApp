import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { invalidarCacheTorneo } from '@/lib/cache';

/**
 * UC-18 (al revés) — Volver un torneo publicado a borrador.
 *
 * **Por qué existe.** Publicar era de ida: `publicarTorneo` llevaba
 * `draft → registration_open` y no había vuelta. Un torneo publicado de
 * prueba, o por error, se quedaba publicado para siempre — lo único
 * parecido era cancelarlo, que es definitivo y además lo deja a la
 * vista con el cartel de cancelado, que es peor que el problema.
 *
 * **Sólo si todavía no pasó nada.** Con equipos inscriptos o con
 * fixture generado, volver a borrador le saca el torneo de encima a
 * gente que ya se anotó: desde su lado desaparecería sin explicación.
 * Ahí la respuesta correcta es suspenderlo (reversible) o cancelarlo
 * (con motivo, y avisando), y el error lo dice en vez de dejar a nadie
 * adivinando. Las inscripciones ya rechazadas o retiradas no frenan
 * nada: no hay nadie esperando del otro lado.
 *
 * Vuelve también la visibilidad a `unlisted` y borra la fecha de
 * publicación: un borrador no se descubre (D-21b), y si se vuelve a
 * publicar es `publicarTorneo` quien decide la visibilidad otra vez
 * según la verificación de la organización (D-51).
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type DespublicarTorneoInput = z.infer<typeof esquemaEntrada>;

/** Inscripciones con alguien esperando del otro lado. */
const INSCRIPCIONES_QUE_FRENAN = ['pending', 'approved', 'waitlisted'];

export const despublicarTorneo: Servicio<DespublicarTorneoInput, { estado: 'draft' }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ estado: string }>('SELECT estado FROM torneo WHERE id = $1', [
    datos.torneoId,
  ]);
  const torneo = rows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');

  // Sólo desde `registration_open`. Más adelante ya hay fixture o
  // partidos jugados, y volver a borrador no sería deshacer la
  // publicación sino borrar un torneo que ocurrió.
  if (torneo.estado !== 'registration_open') throw crearError('TRANSICION_NO_PERMITIDA');

  const { rows: ocupado } = await pool.query<{ inscripciones: string; partidos: string }>(
    `SELECT
       (SELECT count(*) FROM inscripcion WHERE torneo_id = $1 AND estado = ANY($2)) AS inscripciones,
       (SELECT count(*) FROM partido WHERE torneo_id = $1) AS partidos`,
    [datos.torneoId, INSCRIPCIONES_QUE_FRENAN],
  );
  const { inscripciones, partidos } = ocupado[0]!;
  if (Number(inscripciones) > 0 || Number(partidos) > 0) {
    throw crearError('TORNEO_YA_TIENE_EQUIPOS');
  }

  await pool.query(
    `UPDATE torneo
     SET estado = 'draft', visibilidad = 'unlisted', fecha_publicacion = NULL,
         version = version + 1
     WHERE id = $1`,
    [datos.torneoId],
  );

  invalidarCacheTorneo(datos.torneoId);

  // No se notifica a nadie: el guard de arriba garantiza que no hay
  // equipos inscriptos, y a un seguidor avisarle que el torneo que
  // seguía volvió a borrador es contarle que dejó de existir.
  return { estado: 'draft' };
};
