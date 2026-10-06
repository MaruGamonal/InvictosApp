/**
 * Quién jugó cada partido.
 *
 * Hasta ahora el producto registraba el resultado y los eventos —goles y
 * tarjetas—, pero no la alineación. Por eso
 * `estadistica_jugador.partidos_jugados` existía desde el esquema
 * original y **nadie la escribía**: no había de dónde sacar el dato, y
 * el historial del jugador (UC-38) no podía decir "8 partidos" sin
 * inventarlo.
 *
 * `integrante_habilitado` no alcanza: dice quién **podía** jugar el
 * torneo, no quién entró a la cancha en un partido puntual. Un suplente
 * que nunca jugó está habilitado igual.
 *
 * **La clave es `(partido_id, perfil_id)`, no `(partido_id, equipo_id,
 * perfil_id)`**: nadie juega un partido para los dos equipos, y con el
 * equipo en la clave esa fila imposible sería legal. `equipo_id` queda
 * como dato —hace falta para acreditar la estadística al equipo con el
 * que jugó— pero no define identidad.
 *
 * `ON DELETE CASCADE` sobre el partido: si el partido desaparece, su
 * alineación no tiene de qué colgar. Sobre el perfil **no**: un perfil
 * no se borra, y si alguna vez se borrara, perder la historia del
 * partido sería peor que el error.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE alineacion_partido (
      partido_id uuid NOT NULL REFERENCES partido(id) ON DELETE CASCADE,
      equipo_id uuid NOT NULL REFERENCES equipo(id),
      perfil_id uuid NOT NULL REFERENCES perfil_deportivo(id),
      -- Titular o suplente que entró: las dos cosas son "jugó". Se
      -- distingue para poder mostrarlo, no para contar distinto.
      fue_titular boolean NOT NULL DEFAULT true,
      PRIMARY KEY (partido_id, perfil_id)
    );
  `);

  // El historial del jugador consulta por perfil, no por partido: sin
  // este índice, "en qué partidos jugó" sería un recorrido de la tabla
  // entera.
  pgm.sql(`CREATE INDEX alineacion_partido_perfil ON alineacion_partido (perfil_id);`);

  // Y la planilla de un partido se lee por partido y equipo.
  pgm.sql(
    `CREATE INDEX alineacion_partido_partido_equipo ON alineacion_partido (partido_id, equipo_id);`,
  );
};

/**
 * Borra la tabla. `estadistica_jugador.partidos_jugados` queda con lo
 * último que se le escribió: volver atrás esta migración no la vacía,
 * porque esa columna existía antes y no es de este cambio.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS alineacion_partido;`);
};
