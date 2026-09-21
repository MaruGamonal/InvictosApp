import { obtenerPool } from '@/db/cliente';

/**
 * Validación del dataset: cada consulta de acá busca una inconsistencia
 * concreta y **tiene que devolver cero filas**. Si alguna devuelve algo,
 * el dataset quedó mal y el script termina con código 1.
 *
 * Es la red que separa "un bug de la aplicación" de "un dato imposible":
 * mientras esto pase, cualquier error que aparezca recorriendo el
 * producto es del producto.
 *
 * Correrlo:
 *   npm run demo:validar
 */

interface Chequeo {
  nombre: string;
  sql: string;
  /** Qué significa que devuelva filas. */
  explicacion: string;
}

const CHEQUEOS: Chequeo[] = [
  {
    nombre: 'huérfanos: perfil sin usuario ni creador',
    explicacion: 'perfiles que no cuelgan de ninguna cuenta existente',
    sql: `SELECT p.id FROM perfil_deportivo p
          LEFT JOIN usuario u ON u.id = p.usuario_id
          WHERE p.usuario_id IS NOT NULL AND u.id IS NULL`,
  },
  {
    nombre: 'huérfanos: usuario apunta a un perfil inexistente',
    explicacion: 'usuario.perfil_deportivo_id roto',
    sql: `SELECT u.id FROM usuario u
          LEFT JOIN perfil_deportivo p ON p.id = u.perfil_deportivo_id
          WHERE u.perfil_deportivo_id IS NOT NULL AND p.id IS NULL`,
  },
  {
    nombre: 'huérfanos: seguimiento a una entidad que no existe',
    explicacion: 'seguidores apuntando a equipos/torneos borrados',
    sql: `SELECT s.usuario_id, s.entidad_seguida_id FROM seguimiento s
          WHERE (s.tipo_seguido = 'team'
                 AND NOT EXISTS (SELECT 1 FROM equipo e WHERE e.id = s.entidad_seguida_id))
             OR (s.tipo_seguido = 'tournament'
                 AND NOT EXISTS (SELECT 1 FROM torneo t WHERE t.id = s.entidad_seguida_id))`,
  },
  {
    nombre: 'huérfanos: notificación de una entidad que no existe',
    explicacion: 'items del feed que no pueden resolverse',
    sql: `SELECT n.id FROM notificacion n
          WHERE n.entidad_origen_tipo = 'torneo'
            AND NOT EXISTS (SELECT 1 FROM torneo t WHERE t.id = n.entidad_origen_id)
          UNION ALL
          SELECT n.id FROM notificacion n
          WHERE n.entidad_origen_tipo = 'partido'
            AND NOT EXISTS (SELECT 1 FROM partido p WHERE p.id = n.entidad_origen_id)`,
  },
  {
    nombre: 'duplicados: mismo perfil dos veces activo en un equipo con el mismo rol',
    explicacion: 'plantel con filas repetidas',
    sql: `SELECT equipo_id, perfil_id, rol_equipo, count(*) FROM integrante_equipo
          GROUP BY 1, 2, 3 HAVING count(*) > 1`,
  },
  /**
   * Los 21 chequeos anteriores miraban relaciones, no identidades, así
   * que una base con dos juegos completos de datos demo los pasaba
   * todos: cada copia era internamente coherente. Lo que rompía la
   * aplicación era ver dos veces el mismo equipo en el descubrimiento y
   * en los perfiles.
   */
  {
    nombre: 'duplicados: dos equipos demo con el mismo nombre',
    explicacion: 'señal de que se sembró encima de una corrida anterior',
    sql: `SELECT nombre, count(*) FROM equipo WHERE nombre LIKE '%[DEMO]%'
          GROUP BY nombre HAVING count(*) > 1`,
  },
  {
    nombre: 'duplicados: dos torneos demo con el mismo nombre y división',
    explicacion: 'señal de que se sembró encima de una corrida anterior',
    sql: `SELECT nombre, division, count(*) FROM torneo WHERE nombre LIKE '%[DEMO]%'
          GROUP BY nombre, division HAVING count(*) > 1`,
  },
  {
    nombre: 'duplicados: dos cuentas demo con el mismo correo',
    explicacion: 'el alta de usuarios demo se corrió dos veces',
    sql: `SELECT email, count(*) FROM usuario WHERE email LIKE '%@demo.invicta.com.ar'
          GROUP BY email HAVING count(*) > 1`,
  },
  {
    nombre: 'duplicados: mismo equipo dos veces en un torneo',
    explicacion: 'inscripciones repetidas',
    sql: `SELECT torneo_id, equipo_id, count(*) FROM inscripcion
          GROUP BY 1, 2 HAVING count(*) > 1`,
  },
  {
    nombre: 'duplicados: seguidor repetido',
    explicacion: 'el contador de seguidores contaría de más',
    sql: `SELECT usuario_id, tipo_seguido, entidad_seguida_id, count(*) FROM seguimiento
          GROUP BY 1, 2, 3 HAVING count(*) > 1`,
  },
  {
    nombre: 'imposibles: partido de un equipo contra sí mismo',
    explicacion: 'fixture inválido',
    sql: `SELECT id FROM partido WHERE equipo_local_id = equipo_visitante_id`,
  },
  {
    nombre: 'imposibles: partido con equipo no inscripto en ese torneo',
    explicacion: 'partidos que contradicen las inscripciones',
    sql: `SELECT p.id FROM partido p
          WHERE NOT EXISTS (
            SELECT 1 FROM inscripcion i
            WHERE i.torneo_id = p.torneo_id AND i.equipo_id = p.equipo_local_id
          ) OR NOT EXISTS (
            SELECT 1 FROM inscripcion i
            WHERE i.torneo_id = p.torneo_id AND i.equipo_id = p.equipo_visitante_id
          )`,
  },
  {
    nombre: 'imposibles: resultado cargado en un partido no jugado',
    explicacion: 'goles sin estado played/walkover',
    sql: `SELECT id FROM partido
          WHERE goles_local IS NOT NULL AND estado NOT IN ('played', 'walkover')`,
  },
  {
    nombre: 'imposibles: jugador del partido que no está habilitado en ese torneo',
    explicacion: 'referencia inválida en jugador destacado',
    sql: `SELECT p.id FROM partido p
          WHERE p.jugador_del_partido_perfil_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM integrante_habilitado ih
              WHERE ih.torneo_id = p.torneo_id
                AND ih.perfil_id = p.jugador_del_partido_perfil_id
                AND ih.equipo_id IN (p.equipo_local_id, p.equipo_visitante_id)
            )`,
  },
  {
    nombre: 'imposibles: evento de un jugador que no juega en ese partido',
    explicacion: 'goles/tarjetas atribuidos a un equipo ajeno al partido',
    sql: `SELECT e.id FROM evento_partido e
          JOIN partido p ON p.id = e.partido_id
          WHERE e.equipo_id NOT IN (p.equipo_local_id, p.equipo_visitante_id)`,
  },
  {
    nombre: 'coherencia: goles cargados ≠ eventos de gol',
    explicacion: 'el marcador no coincide con los goles por jugador',
    sql: `SELECT p.id, p.goles_local, p.goles_visitante
          FROM partido p
          WHERE p.goles_local IS NOT NULL
            AND EXISTS (SELECT 1 FROM evento_partido e WHERE e.partido_id = p.id)
            AND (
              p.goles_local <> (
                SELECT count(*) FROM evento_partido e
                WHERE e.partido_id = p.id AND e.tipo_evento = 'goal' AND e.equipo_id = p.equipo_local_id
              )
              OR p.goles_visitante <> (
                SELECT count(*) FROM evento_partido e
                WHERE e.partido_id = p.id AND e.tipo_evento = 'goal' AND e.equipo_id = p.equipo_visitante_id
              )
            )`,
  },
  {
    nombre: 'coherencia: la tabla no coincide con los partidos jugados',
    explicacion: 'posicion.partidos_jugados distinto de los partidos con resultado',
    sql: `SELECT pos.equipo_id, pos.partidos_jugados, calc.jugados
          FROM posicion pos
          JOIN grupo g ON g.id = pos.grupo_id
          JOIN fase f ON f.id = g.fase_id
          JOIN LATERAL (
            SELECT count(*) AS jugados FROM partido p
            WHERE p.fase_id = f.id AND p.estado IN ('played', 'walkover')
              AND pos.equipo_id IN (p.equipo_local_id, p.equipo_visitante_id)
          ) calc ON true
          WHERE pos.partidos_jugados <> calc.jugados`,
  },
  {
    nombre: 'coherencia: goles a favor de la tabla ≠ goles de los partidos',
    explicacion: 'la tabla se desincronizó de los resultados',
    sql: `SELECT pos.equipo_id, pos.goles_favor, calc.favor
          FROM posicion pos
          JOIN grupo g ON g.id = pos.grupo_id
          JOIN fase f ON f.id = g.fase_id
          JOIN LATERAL (
            SELECT COALESCE(SUM(
              CASE WHEN p.equipo_local_id = pos.equipo_id THEN p.goles_local
                   ELSE p.goles_visitante END), 0) AS favor
            FROM partido p
            WHERE p.fase_id = f.id AND p.estado IN ('played', 'walkover')
              AND pos.equipo_id IN (p.equipo_local_id, p.equipo_visitante_id)
          ) calc ON true
          WHERE pos.goles_favor <> calc.favor`,
  },
  {
    nombre: 'coherencia: estadísticas de jugador ≠ eventos cargados',
    explicacion: 'estadistica_jugador.goles no deriva de evento_partido',
    sql: `SELECT ej.torneo_id, ej.perfil_id, ej.goles, calc.goles AS reales
          FROM estadistica_jugador ej
          JOIN LATERAL (
            SELECT count(*) AS goles FROM evento_partido e
            JOIN partido p ON p.id = e.partido_id
            WHERE p.torneo_id = ej.torneo_id AND e.perfil_id = ej.perfil_id
              AND e.tipo_evento = 'goal'
          ) calc ON true
          WHERE ej.goles <> calc.goles`,
  },
  {
    nombre: 'estructura: torneo de certamen sin división (o al revés)',
    explicacion: 'viola el check de D-103 (los dos o ninguno)',
    sql: `SELECT id FROM torneo WHERE (certamen_id IS NULL) <> (division IS NULL)`,
  },
  {
    nombre: 'estructura: torneo publicado sin fecha de inicio',
    explicacion: 'estado imposible según publicarTorneo',
    sql: `SELECT id FROM torneo
          WHERE estado <> 'draft' AND fecha_inicio_estimada IS NULL`,
  },
  {
    nombre: 'estructura: torneo in_progress o finished sin fixture',
    explicacion: 'no se puede estar jugando sin partidos',
    sql: `SELECT t.id FROM torneo t
          WHERE t.estado IN ('in_progress', 'finished')
            AND NOT EXISTS (SELECT 1 FROM partido p WHERE p.torneo_id = t.id)`,
  },
  {
    nombre: 'estructura: torneo finalizado con partidos sin jugar',
    explicacion: 'un torneo terminado no debería tener fechas pendientes',
    sql: `SELECT p.id FROM partido p JOIN torneo t ON t.id = p.torneo_id
          WHERE t.estado = 'finished' AND p.estado NOT IN ('played', 'walkover', 'cancelled')`,
  },
  {
    // `obtenerFichaTorneo` no arriesga un campeón si hay empate en la cima:
    // devuelve null, y la ficha del torneo terminado queda sin esa sección.
    // Para el dataset demo eso se lee como un bug, así que se chequea acá.
    nombre: 'cobertura: torneo finalizado con empate en la cima (quedaría sin campeón)',
    explicacion: 'la ficha del torneo terminado no mostraría campeón',
    sql: `SELECT t.id
          FROM torneo t
          JOIN fase f ON f.torneo_id = t.id
          JOIN grupo g ON g.fase_id = f.id
          JOIN posicion p ON p.grupo_id = g.id
          WHERE t.estado = 'finished'
          GROUP BY t.id
          HAVING count(*) FILTER (
            WHERE (p.puntos + p.ajuste_puntos) = (
              SELECT max(p2.puntos + p2.ajuste_puntos)
              FROM posicion p2
              JOIN grupo g2 ON g2.id = p2.grupo_id
              JOIN fase f2 ON f2.id = g2.fase_id
              WHERE f2.torneo_id = t.id
            )
          ) > 1`,
  },
];

/** Los contadores que muestra la interfaz salen de count() sobre estas tablas: se verifica que haya algo real detrás. */
async function resumen(): Promise<void> {
  const { rows } = await obtenerPool().query<{ etiqueta: string; valor: string }>(`
    SELECT 'torneos demo' AS etiqueta, count(*)::text AS valor FROM torneo WHERE nombre LIKE '%[DEMO]%'
    UNION ALL SELECT 'equipos demo', count(*)::text FROM equipo WHERE nombre LIKE '%[DEMO]%'
    UNION ALL SELECT 'usuarios demo', count(*)::text FROM usuario WHERE email LIKE '%@demo.invicta.com.ar'
    UNION ALL SELECT '  de ellos sin confirmar', count(*)::text FROM usuario WHERE email LIKE '%@demo.invicta.com.ar' AND email_confirmado = false
    UNION ALL SELECT 'partidos', count(*)::text FROM partido
    UNION ALL SELECT '  con resultado', count(*)::text FROM partido WHERE goles_local IS NOT NULL
    UNION ALL SELECT '  con jugador del partido', count(*)::text FROM partido WHERE jugador_del_partido_perfil_id IS NOT NULL
    UNION ALL SELECT 'eventos (goles/tarjetas)', count(*)::text FROM evento_partido
    UNION ALL SELECT 'estadísticas de jugador', count(*)::text FROM estadistica_jugador
    UNION ALL SELECT 'habilitados (lista de buena fe)', count(*)::text FROM integrante_habilitado
    UNION ALL SELECT 'seguimientos', count(*)::text FROM seguimiento
    UNION ALL SELECT 'inscripciones aprobadas', count(*)::text FROM inscripcion WHERE estado = 'approved'
    UNION ALL SELECT '  pendientes', count(*)::text FROM inscripcion WHERE estado = 'pending'
    UNION ALL SELECT 'certámenes', count(*)::text FROM certamen
    UNION ALL SELECT 'notificaciones', count(*)::text FROM notificacion
  `);
  console.log('Resumen del dataset:');
  for (const fila of rows) console.log(`  ${fila.etiqueta}: ${fila.valor}`);
}

/**
 * Qué chequeo falló y con qué filas. Se devuelve en vez de solo contar
 * porque el script no es el único que llama acá: la ruta de API corre lo
 * mismo desde el entorno desplegado, donde el `console.log` queda en los
 * logs del servidor y quien disparó la corrida solo ve lo que vuelve en
 * la respuesta. Un número suelto ahí no sirve para nada: dice que algo
 * anda mal y no qué.
 */
export interface FallaDeValidacion {
  nombre: string;
  explicacion: string;
  filas: number;
  ejemplos: unknown[];
}

export async function validarDemo(): Promise<FallaDeValidacion[]> {
  const pool = obtenerPool();
  await resumen();

  console.log('\nChequeos (cada uno tiene que dar 0 filas):');
  const fallas: FallaDeValidacion[] = [];
  for (const chequeo of CHEQUEOS) {
    const { rows } = await pool.query(chequeo.sql);
    if (rows.length === 0) {
      console.log(`  ok   ${chequeo.nombre}`);
      continue;
    }
    fallas.push({
      nombre: chequeo.nombre,
      explicacion: chequeo.explicacion,
      filas: rows.length,
      ejemplos: rows.slice(0, 3),
    });
    console.log(`  FALLA ${chequeo.nombre} → ${rows.length} fila(s): ${chequeo.explicacion}`);
    console.log(`        ${JSON.stringify(rows.slice(0, 3))}`);
  }

  console.log(
    fallas.length === 0
      ? `\n${CHEQUEOS.length} chequeos pasados: el dataset es consistente.`
      : `\n${fallas.length} de ${CHEQUEOS.length} chequeos fallaron.`,
  );
  return fallas;
}

// `--ejecutar` lo pone el script de npm. Sin ese flag el módulo solo
// exporta (así la ruta de API puede importarlo sin dispararlo al cargar).
if (process.argv.includes('--ejecutar')) {
  validarDemo()
    .then(async (fallas) => {
      await obtenerPool().end();
      process.exit(fallas.length === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
