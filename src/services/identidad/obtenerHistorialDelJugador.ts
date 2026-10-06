import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-38 — El historial de un jugador, torneo por torneo: "jugué la Copa
 * Costanera con Deportivo Pichincha, 3 goles". Público y sin sesión,
 * como el resto del perfil.
 *
 * **Parte de `integrante_habilitado`, la lista de buena fe**, no de
 * `estadistica_jugador`: aquella dice quién estaba habilitado para jugar
 * ese torneo con ese equipo, y ésta sólo tiene fila para quien hizo un
 * gol o se comió una tarjeta. Partiendo de las estadísticas, un arquero
 * que jugó el torneo entero sin que le anotaran nada no aparecería.
 *
 * **No se filtra por la visibilidad del perfil** (`02`, UC-04): un
 * perfil `restricted` oculta foto, posición y ciudad, nunca la
 * participación. Tampoco por `visibilidad` del torneo, igual que la
 * ficha pública del equipo, que ya lista todos sus torneos: lo que
 * `unlisted` condiciona es el descubrimiento (D-51), no que el torneo
 * sea secreto — se abre por enlace directo igual.
 *
 * **Los partidos jugados cuentan sólo lo que se cargó.** Desde que
 * existe `alineacion_partido`, `cargarResultado` escribe
 * `estadistica_jugador.partidos_jugados` — una columna que hasta
 * entonces nadie tocaba—. Pero la alineación es **opcional**: un torneo
 * donde nadie la carga deja ese número en cero aunque se hayan jugado
 * todos los partidos. Por eso se muestra sólo cuando es mayor que cero,
 * en vez de un "0 partidos" que se leería como "no jugó".
 */

const esquemaEntrada = z.object({ perfilId: z.string().uuid() });
export type ObtenerHistorialDelJugadorInput = z.infer<typeof esquemaEntrada>;

export interface TorneoDelHistorial {
  torneoId: string;
  torneoNombre: string;
  /** Estado del torneo, para la etiqueta: `in_progress`, `finished`, … */
  estado: string;
  modalidad: string;
  categoriaGenero: string;
  ciudadNombre: string | null;
  /** Fecha ISO de inicio estimada, o `null` si el torneo no la cargó. */
  fechaInicio: string | null;
  fechaFin: string | null;
  equipoId: string;
  equipoNombre: string;
  equipoEscudoUrl: string | null;
  /** `player`, `coach` o `delegate` — con qué rol estuvo habilitado. */
  rolEnTorneo: string;
  /**
   * Partidos en los que figura en la alineación. Cero también significa
   * "nadie cargó la alineación en este torneo": es opcional.
   */
  partidosJugados: number;
  goles: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  /** Veces que se lo eligió jugador del partido en ese torneo. */
  vecesJugadorDelPartido: number;
}

interface FilaCruda {
  torneo_id: string;
  torneo_nombre: string;
  estado: string;
  modalidad: string;
  categoria_genero: string;
  ciudad_nombre: string | null;
  // `timestamptz` vuelve como `Date` del driver, no como texto: se
  // convierte a ISO al salir, igual que el resto de los servicios.
  fecha_inicio: Date | null;
  fecha_fin: Date | null;
  equipo_id: string;
  equipo_nombre: string;
  equipo_escudo_url: string | null;
  rol_en_torneo: string;
  partidos_jugados: number;
  goles: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  veces_jugador_del_partido: string;
}

export const obtenerHistorialDelJugador: Servicio<
  ObtenerHistorialDelJugadorInput,
  TorneoDelHistorial[]
> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows } = await pool.query<FilaCruda>(
    // `DISTINCT ON (torneo, equipo)`: la clave de `integrante_habilitado`
    // incluye el rol, así que quien estuvo habilitado como jugadora y
    // además como delegada traería dos filas del mismo torneo. Se queda
    // con `player` cuando existe, que es con lo que se jugó.
    `SELECT DISTINCT ON (ih.torneo_id, ih.equipo_id)
            ih.torneo_id, t.nombre AS torneo_nombre, t.estado, t.modalidad, t.categoria_genero,
            c.nombre AS ciudad_nombre,
            t.fecha_inicio_estimada AS fecha_inicio, t.fecha_fin_estimada AS fecha_fin,
            ih.equipo_id, e.nombre AS equipo_nombre, e.escudo_url AS equipo_escudo_url,
            ih.rol_en_torneo,
            coalesce(ej.partidos_jugados, 0) AS partidos_jugados,
            coalesce(ej.goles, 0) AS goles,
            coalesce(ej.tarjetas_amarillas, 0) AS tarjetas_amarillas,
            coalesce(ej.tarjetas_rojas, 0) AS tarjetas_rojas,
            (SELECT count(*) FROM partido p
             WHERE p.torneo_id = ih.torneo_id
               AND p.jugador_del_partido_perfil_id = ih.perfil_id
               AND p.estado IN ('played', 'walkover')
            ) AS veces_jugador_del_partido
     FROM integrante_habilitado ih
     JOIN torneo t ON t.id = ih.torneo_id
     JOIN equipo e ON e.id = ih.equipo_id
     LEFT JOIN ciudad c ON c.id = t.ciudad_id
     LEFT JOIN estadistica_jugador ej
       ON ej.torneo_id = ih.torneo_id
      AND ej.equipo_id = ih.equipo_id
      AND ej.perfil_id = ih.perfil_id
     WHERE ih.perfil_id = $1
     ORDER BY ih.torneo_id, ih.equipo_id, (ih.rol_en_torneo = 'player') DESC, ih.rol_en_torneo ASC`,
    [datos.perfilId],
  );

  // El orden de presentación se arma acá: el `ORDER BY` de la consulta
  // lo manda `DISTINCT ON`, que obliga a empezar por sus propias
  // columnas. Lo más reciente primero, y sin fecha al final.
  const historial = rows.map((fila): TorneoDelHistorial => ({
    torneoId: fila.torneo_id,
    torneoNombre: fila.torneo_nombre,
    estado: fila.estado,
    modalidad: fila.modalidad,
    categoriaGenero: fila.categoria_genero,
    ciudadNombre: fila.ciudad_nombre,
    fechaInicio: fila.fecha_inicio?.toISOString() ?? null,
    fechaFin: fila.fecha_fin?.toISOString() ?? null,
    equipoId: fila.equipo_id,
    equipoNombre: fila.equipo_nombre,
    equipoEscudoUrl: fila.equipo_escudo_url,
    rolEnTorneo: fila.rol_en_torneo,
    partidosJugados: fila.partidos_jugados,
    goles: fila.goles,
    tarjetasAmarillas: fila.tarjetas_amarillas,
    tarjetasRojas: fila.tarjetas_rojas,
    vecesJugadorDelPartido: Number(fila.veces_jugador_del_partido ?? 0),
  }));

  historial.sort((a, b) => {
    if (a.fechaInicio === b.fechaInicio) return a.torneoNombre.localeCompare(b.torneoNombre);
    if (a.fechaInicio === null) return 1;
    if (b.fechaInicio === null) return -1;
    return b.fechaInicio.localeCompare(a.fechaInicio);
  });

  return historial;
};
