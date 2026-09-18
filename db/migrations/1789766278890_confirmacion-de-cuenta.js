/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Reportado en vivo: pedir sumarse a un equipo, crear un equipo o crear
 * un torneo va a exigir de ahora en más tener el email de la cuenta
 * confirmado — hasta ahora D-90 lo dejaba deliberadamente sin bloquear
 * nada. Esta migración solo agrega la columna; el resto de la sesión
 * cablea el flujo (`registrar.ts` deja de auto-confirmar, el enlace de
 * `auth/callback` marca esta columna, y las tres acciones la exigen).
 *
 * Default `true`: las cuentas que ya existen no quedan bloqueadas de
 * golpe por un cambio de regla posterior a su alta.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('usuario', {
    email_confirmado: { type: 'boolean', notNull: true, default: true },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropColumns('usuario', ['email_confirmado']);
};
