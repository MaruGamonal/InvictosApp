/**
 * La zona horaria en la que se muestran las fechas y horas.
 *
 * El producto es argentino (catálogo nacional de ciudades, `06`, D-88) y
 * Argentina tiene un solo huso, UTC−3, sin horario de verano. Sin fijarla,
 * cada `toLocaleDateString` usaba la del proceso: en el servidor —Vercel
 * corre en UTC— un partido de las 15:00 se mostraba a las 18:00, uno de
 * las 22:00 caía en el día siguiente, y la misma fecha podía verse
 * distinta en el servidor y en el navegador.
 *
 * Se usa para **instantes**: la hora de un partido, un plazo, cuándo se
 * publicó un reglamento. Las fechas de calendario (inicio y fin
 * estimados del torneo) son otra cosa: se cargan con un `<input
 * type="date">` y se guardan como medianoche UTC, así que se muestran con
 * `ZONA_DE_FECHAS_DE_CALENDARIO` — en hora argentina caerían en el día
 * anterior.
 */
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

/** Ver `ZONA_HORARIA`: las fechas sin hora se guardan como medianoche UTC. */
export const ZONA_DE_FECHAS_DE_CALENDARIO = 'UTC';
