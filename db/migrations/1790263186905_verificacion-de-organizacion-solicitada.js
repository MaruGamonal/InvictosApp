/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * UC-06 — Deja registrada la solicitud de verificación básica en la
 * base, en vez de confiarla solo a la URL de vuelta del correo.
 *
 * **Por qué.** `solicitarVerificacionBasica` mandaba el id de la
 * organización dentro de `emailRedirectTo`
 * (`/acceso/confirmar/organizacion/<id>`), y la aplicación lo leía de
 * la ruta al volver. Eso funciona solo si la plantilla del correo
 * reenvía esa URL entera (`{{ .RedirectTo }}`); si arma el enlace con
 * `{{ .SiteURL }}` y le pega el token, **el id se pierde en el camino**.
 * El resultado es el reportado en vivo: la persona toca el enlace, la
 * cuenta queda confirmada y la organización sigue sin verificar, sin
 * ningún error a la vista.
 *
 * Con la marca acá, volver del correo alcanza: se busca qué
 * verificación había pedido esa persona y se aplica. La plantilla puede
 * estar como esté.
 *
 * No es un permiso ni un token: es "esta persona pidió verificar esto,
 * y cuándo". Quien confirma sigue teniendo que ser el titular, y la
 * prueba sigue siendo controlar la casilla de correo (`06`, D-76).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.addColumns('organizacion', {
    verificacion_solicitada_en: {
      type: 'timestamptz',
      notNull: false,
      comment:
        'Cuándo se pidió la verificación básica (UC-06). Se limpia al verificar. Null = sin pedido pendiente.',
    },
  });

  // Se consulta por titular al volver del correo, y solo interesan las
  // que tienen pedido pendiente: el índice parcial deja afuera al resto.
  pgm.createIndex('organizacion', ['usuario_titular_id'], {
    name: 'organizacion_verificacion_pendiente_idx',
    where: 'verificacion_solicitada_en IS NOT NULL',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex('organizacion', ['usuario_titular_id'], {
    name: 'organizacion_verificacion_pendiente_idx',
  });
  pgm.dropColumns('organizacion', ['verificacion_solicitada_en']);
};
