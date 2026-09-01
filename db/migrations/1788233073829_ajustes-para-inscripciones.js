/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * T12 — dos ajustes que sus propios criterios de aceptación exigen y
 * que T2 no había podido anticipar:
 *
 * 1. `equipo.perfil_capitan_id` pasa a ser opcional. `inscribirEquipoManual`
 *    (UC-26, `06` D-29b) crea equipos **sin capitán asignado** cuando el
 *    organizador carga uno que no existe en la plataforma — reclamable
 *    después, mismo mecanismo que el perfil de jugador. Hasta ahora la
 *    columna era NOT NULL porque el único camino de alta (UC-10) siempre
 *    tiene a quien lo crea como capitán; este es un segundo camino
 *    legítimo donde todavía no hay nadie.
 * 2. `torneo.admite_lista_espera boolean DEFAULT true`: el catálogo de
 *    errores (`10`, 8.2) ya documentaba `CUPO_COMPLETO` como "solo si el
 *    torneo no admite lista de espera", dando por sentado un parámetro
 *    que nunca se había agregado al esquema.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE equipo ALTER COLUMN perfil_capitan_id DROP NOT NULL;
    ALTER TABLE torneo ADD COLUMN admite_lista_espera boolean NOT NULL DEFAULT true;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE torneo DROP COLUMN admite_lista_espera;
    ALTER TABLE equipo ALTER COLUMN perfil_capitan_id SET NOT NULL;
  `);
};
