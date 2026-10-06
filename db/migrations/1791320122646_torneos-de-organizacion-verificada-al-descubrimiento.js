/**
 * Reparación de datos: los torneos que quedaron fuera del descubrimiento
 * aunque su organización ya está verificada.
 *
 * `publicarTorneo` decide la visibilidad en el momento de publicar
 * (`06`, D-51): sin verificar, el torneo nace `unlisted`. Verificarse
 * después no movía nada —ese enganche recién se agrega ahora, en
 * `_publicarTorneosNoListados`—, así que todo torneo publicado antes de
 * la verificación de su organización se quedó afuera de las búsquedas
 * para siempre. El código nuevo arregla los próximos; estos ya pasaron.
 *
 * Mismo criterio que el enganche: solo torneos ya publicados (ni `draft`
 * ni `cancelled`) de organizaciones efectivamente verificadas.
 *
 * Sin `down`: devolver estos torneos a `unlisted` sería indistinguible
 * de volver a esconder torneos que nunca tuvieron el problema, porque
 * después de correr esto ya no queda registro de cuáles eran cuáles.
 */

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE torneo t
    SET visibilidad = 'public', version = version + 1
    FROM organizacion o
    WHERE o.id = t.organizacion_id
      AND o.nivel_verificacion <> 'unverified'
      AND t.visibilidad = 'unlisted'
      AND t.estado NOT IN ('draft', 'cancelled')
  `);
};

exports.down = () => {};
