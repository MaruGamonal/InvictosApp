/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * T15 — `ajustarPuntos` (UC-35, `06` D-35b) recibe un `motivo` como parte
 * de su propia definición en el backlog, pero `posicion` no tenía dónde
 * guardarlo. Sin esto, la quita o bonificación quedaría en `ajuste_puntos`
 * sin explicación — lo mismo que el principio 6 de `05` prohíbe para
 * resultados y reglamentos ("todo lo que se corrige en silencio termina
 * siendo una discusión"), aplicado acá a un ajuste manual de puntos.
 *
 * Guarda solo **el último ajuste**, no un historial completo: alcanza
 * para explicar de dónde sale el número que se ve hoy en la tabla, que es
 * lo que pide el ticket; un historial de sanciones acumuladas es una
 * funcionalidad más grande que nadie pidió todavía.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE posicion ADD COLUMN ultimo_ajuste_motivo text;
    ALTER TABLE posicion ADD COLUMN ultimo_ajuste_por_usuario_id uuid REFERENCES usuario(id);
    ALTER TABLE posicion ADD COLUMN ultimo_ajuste_fecha timestamptz;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE posicion DROP COLUMN ultimo_ajuste_fecha;
    ALTER TABLE posicion DROP COLUMN ultimo_ajuste_por_usuario_id;
    ALTER TABLE posicion DROP COLUMN ultimo_ajuste_motivo;
  `);
};
