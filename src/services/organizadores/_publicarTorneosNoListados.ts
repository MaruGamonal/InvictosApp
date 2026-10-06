import { obtenerPool } from '@/db/cliente';
import { invalidarCacheTorneo } from '@/lib/cache';

/**
 * Al verificarse una organización, sus torneos ya publicados entran al
 * descubrimiento.
 *
 * **Por qué existe.** `publicarTorneo` decide la visibilidad **en el
 * momento de publicar** (`06`, D-51): organización verificada → `public`;
 * sin verificar → `unlisted`, accesible por link pero fuera de las
 * búsquedas (D-21b). Lo que faltaba era la otra mitad: verificarse
 * después no movía nada, así que el torneo quedaba fuera del
 * descubrimiento para siempre. Reportado en vivo — la organización se
 * verificaba y los torneos seguían sin aparecer, y no había ninguna
 * pantalla ni ningún error que lo explicara, porque desde el punto de
 * vista del código no había pasado nada.
 *
 * Verificarse es justamente lo que D-51 pide a cambio de aparecer en las
 * búsquedas; si no lo da, la verificación no sirve para lo único que la
 * motiva.
 *
 * **Qué no toca.** Un `draft` no se publica por esta vía: nace
 * `unlisted` por defecto y es `publicarTorneo` quien le pone la
 * visibilidad cuando se lo publica. Un `cancelled` tampoco: nadie busca
 * dónde jugar un torneo que no va a jugarse (mismo criterio que
 * `buscarTorneos`).
 *
 * **Tampoco notifica.** El torneo ya estaba publicado y sus seguidores
 * ya recibieron ese aviso; lo que cambia acá es dónde se lo encuentra,
 * no que exista. Un segundo `tournament_published` sería un duplicado.
 */
export async function publicarTorneosNoListados(organizacionId: string): Promise<string[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE torneo
     SET visibilidad = 'public', version = version + 1
     WHERE organizacion_id = $1
       AND visibilidad = 'unlisted'
       AND estado NOT IN ('draft', 'cancelled')
     RETURNING id`,
    [organizacionId],
  );

  // La ficha pública cachea `visibilidad`: sin esto el torneo aparecería
  // en la búsqueda (que no se cachea) pero su ficha seguiría sirviendo la
  // versión vieja.
  for (const fila of rows) invalidarCacheTorneo(fila.id);

  return rows.map((fila) => fila.id);
}
