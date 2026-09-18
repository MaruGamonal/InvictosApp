/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Revisión 17 (`06`, D-103 a D-106) — un torneo con varias categorías
 * competitivas (A, B, C) se modela como **varios torneos agrupados**,
 * no como un nivel nuevo adentro del torneo: cada categoría tiene
 * fixture, tabla, campeón, cupo y estado propios, que es la definición
 * de Torneo en este modelo. `certamen` es deliberadamente mínima —solo
 * identidad (`03`, 3.23)— porque lo compartido se copia a cada
 * división al crearla (D-105), no se referencia.
 *
 * El único parcial es sobre `(certamen_id, division)` **donde
 * certamen_id no es nulo**: el caso normal (torneo suelto, los dos
 * campos vacíos) no puede verse afectado por esta revisión.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('certamen', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    organizacion_id: { type: 'uuid', notNull: true, references: 'organizacion(id)' },
    nombre: { type: 'text', notNull: true },
  });

  pgm.addColumns('torneo', {
    certamen_id: { type: 'uuid', references: 'certamen(id)' },
    division: { type: 'text' },
  });

  pgm.addConstraint('torneo', 'torneo_certamen_division_completos_check', {
    check: '(certamen_id IS NULL) = (division IS NULL)',
  });

  pgm.createIndex('torneo', ['certamen_id', 'division'], {
    unique: true,
    where: 'certamen_id IS NOT NULL',
    name: 'torneo_certamen_id_division_unique',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('torneo', ['certamen_id', 'division'], {
    name: 'torneo_certamen_id_division_unique',
  });
  pgm.dropConstraint('torneo', 'torneo_certamen_division_completos_check');
  pgm.dropColumns('torneo', ['certamen_id', 'division']);
  pgm.dropTable('certamen');
};
