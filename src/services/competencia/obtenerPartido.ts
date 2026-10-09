import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { CONFIGURACION } from '@/lib/configuracion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { esErrorDeAplicacion } from '@/lib/errores';
import { puedeResponderPorElEquipo, resolverEquipoQueResponde } from './_rival';
import { esCapitanDeAlgunEquipo } from './cargarResultado';
import { ESTADOS_QUE_ESPERAN_RESULTADO } from '@/lib/marcador';

/**
 * Un partido, con lo que quien mira puede hacer con él.
 *
 * Nace para la pantalla del partido (T29), que es la primera que
 * existe: hasta acá el producto tenía fixture, tabla y ficha, pero
 * ningún lugar donde pararse frente a **un** partido. Por eso las
 * notificaciones de origen `partido` —programado, reprogramado,
 * resultado por confirmar, resultado objetado— no tenían a dónde
 * llevar.
 *
 * Los dos permisos se resuelven acá, en el servidor, y viajan como
 * booleanos: la pantalla decide qué dibuja, nunca si se puede. Los
 * servicios que actúan los vuelven a verificar por su cuenta, porque
 * ocultar un botón no impide que se le pegue a la API.
 *
 * Es de lectura y no exige sesión: un partido de un torneo publicado es
 * público como su fixture. Sin sesión, los dos booleanos son `false`.
 */

const esquemaEntrada = z.object({ partidoId: z.string().uuid() });
export type ObtenerPartidoInput = z.infer<typeof esquemaEntrada>;

export interface EquipoDelPartido {
  id: string;
  nombre: string;
  escudoUrl: string | null;
}

export interface ObjecionAbierta {
  motivo: string;
  equipoId: string;
  fechaPresentacion: string;
}

/** Alguien que jugó este partido (UC-38). */
export interface JugadorAlineado {
  perfilId: string;
  nombreVisible: string;
  equipoId: string;
  fueTitular: boolean;
}

/** Alguien que **podía** jugar: la lista de buena fe del torneo. */
export interface JugadorHabilitado {
  perfilId: string;
  nombreVisible: string;
  equipoId: string;
  numeroCamiseta: number | null;
}

export interface PartidoDetallado {
  id: string;
  torneoId: string;
  torneoNombre: string;
  numeroFecha: number;
  estado: string;
  estadoResultado: 'pending' | 'loaded' | 'confirmed' | 'disputed';
  /**
   * Control de concurrencia optimista: quien vaya a escribir sobre este
   * partido tiene que devolverla, y `cargarResultado` rechaza si cambió
   * mientras tanto. Sin esto, la pantalla no puede guardar nada.
   */
  version: number;
  golesLocal: number | null;
  golesVisitante: number | null;
  local: EquipoDelPartido;
  visitante: EquipoDelPartido;
  fechaHoraProgramada: string | null;
  sedeNombre: string | null;
  /** Nombre de quien cargó el resultado. `null` si todavía no hay resultado. */
  cargadoPor: string | null;
  fechaCargaResultado: string | null;
  /** Cuándo queda firme solo, si nadie responde. `null` si no aplica. */
  confirmaSoloEl: string | null;
  objecionAbierta: ObjecionAbierta | null;
  /** El equipo que no cargó: el único que puede confirmar u objetar. */
  equipoQueRespondeId: string | null;
  /** Quien mira es capitán o delegado de ese equipo, y todavía se puede responder. */
  puedeResponder: boolean;
  /** Quien mira gestiona el torneo y hay una objeción esperando resolución. */
  puedeResolverObjecion: boolean;
  /**
   * Quiénes jugaron, los dos equipos juntos. Público: quién jugó un
   * partido es un hecho del partido, como el marcador.
   */
  alineacion: JugadorAlineado[];
  /** Quien mira gestiona el torneo y el partido admite cargar la alineación. */
  puedeCargarAlineacion: boolean;
  /**
   * Quien mira es capitán de alguno de los dos equipos y este partido
   * todavía espera resultado (`06`, D-07b).
   *
   * Es el permiso que `cargarResultado` ya aceptaba desde siempre y que
   * **ninguna pantalla ofrecía**: sin esto, un resultado nunca podía
   * quedar en `loaded`, y entonces nada de lo que vive después —que el
   * rival confirme u objete, que el plazo lo confirme solo— llegaba a
   * ocurrir nunca.
   */
  puedeCargarResultado: boolean;
  /**
   * Quiénes podían jugar, para armar la alineación. Vacío salvo que
   * `puedeCargarAlineacion`: la lista de buena fe tiene su propia
   * pantalla y sus propios permisos, y no se filtra por acá.
   */
  habilitados: JugadorHabilitado[];
}

interface Fila {
  id: string;
  torneo_id: string;
  torneo_nombre: string;
  numero_fecha: number;
  estado: string;
  estado_resultado: PartidoDetallado['estadoResultado'];
  version: number;
  goles_local: number | null;
  goles_visitante: number | null;
  equipo_local_id: string;
  equipo_local_nombre: string;
  equipo_local_escudo: string | null;
  equipo_visitante_id: string;
  equipo_visitante_nombre: string;
  equipo_visitante_escudo: string | null;
  fecha_hora_programada: Date | null;
  sede_nombre: string | null;
  cargado_por_usuario_id: string | null;
  cargado_por_nombre: string | null;
  fecha_carga_resultado: Date | null;
  torneo_estado: string;
  solo_organizador_carga_resultados: boolean;
}

export const obtenerPartido: Servicio<ObtenerPartidoInput, PartidoDetallado> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows } = await pool.query<Fila>(
    `SELECT p.id, p.torneo_id, t.nombre AS torneo_nombre, p.numero_fecha, p.estado,
            t.estado AS torneo_estado, t.solo_organizador_carga_resultados,
            p.estado_resultado, p.version, p.goles_local, p.goles_visitante,
            p.equipo_local_id, el.nombre AS equipo_local_nombre, el.escudo_url AS equipo_local_escudo,
            p.equipo_visitante_id, ev.nombre AS equipo_visitante_nombre,
            ev.escudo_url AS equipo_visitante_escudo,
            p.fecha_hora_programada, s.nombre AS sede_nombre,
            p.cargado_por_usuario_id, pd.nombre_visible AS cargado_por_nombre,
            p.fecha_carga_resultado
     FROM partido p
     JOIN torneo t ON t.id = p.torneo_id
     JOIN equipo el ON el.id = p.equipo_local_id
     JOIN equipo ev ON ev.id = p.equipo_visitante_id
     LEFT JOIN sede s ON s.id = p.sede_id
     LEFT JOIN perfil_deportivo pd ON pd.usuario_id = p.cargado_por_usuario_id
     WHERE p.id = $1`,
    [datos.partidoId],
  );
  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');

  const { rows: objeciones } = await pool.query<{
    motivo: string;
    equipo_id: string;
    fecha_presentacion: Date;
  }>(
    `SELECT motivo, equipo_id, fecha_presentacion
     FROM disputa_resultado
     WHERE partido_id = $1 AND estado = 'open'
     ORDER BY fecha_presentacion DESC LIMIT 1`,
    [datos.partidoId],
  );
  const objecion = objeciones[0] ?? null;

  const equipoQueResponde = await resolverEquipoQueResponde(pool, {
    equipo_local_id: fila.equipo_local_id,
    equipo_visitante_id: fila.equipo_visitante_id,
    cargado_por_usuario_id: fila.cargado_por_usuario_id,
  });

  // Sólo mientras el resultado espera respuesta. Una vez confirmado
  // —por el rival o por el plazo— no hay nada que responder, y
  // mientras hay una objeción abierta la pelota la tiene el
  // organizador.
  const puedeResponder =
    fila.estado_resultado === 'loaded' &&
    equipoQueResponde !== null &&
    (await puedeResponderPorElEquipo(pool, contexto, equipoQueResponde));

  // Un solo chequeo para las dos cosas que dependen de gestionar el
  // torneo: resolver una objeción y cargar la alineación.
  let gestionaElTorneo = false;
  if (contexto.usuarioId) {
    try {
      await verificarPermisoTorneo(contexto, fila.torneo_id, 'cargar_resultados');
      gestionaElTorneo = true;
    } catch (error) {
      // No lo gestiona: ve, no toca. Un error distinto de permiso sí es
      // un problema real.
      if (!esErrorDeAplicacion(error) || error.codigo !== 'SIN_PERMISO') throw error;
    }
  }
  const puedeResolverObjecion = Boolean(objecion) && gestionaElTorneo;

  // Sólo con el partido ya jugado. La alineación se guarda a través de
  // `cargarResultado`, que escribe el marcador en la misma operación:
  // ofrecerla antes obligaría a inventar un resultado para poder anotar
  // quién jugó. Y tiene sentido al revés también — quién jugó se sabe
  // cuando el partido terminó.
  const puedeCargarAlineacion = gestionaElTorneo && fila.estado === 'played';

  // El capitán carga el resultado de su partido (`06`, D-07b). Sólo
  // mientras el partido espera uno: corregir un resultado ya cargado es
  // del organizador, y el rival tiene su propio camino —objetar— que
  // sería absurdo duplicar con una recarga.
  //
  // `!gestionaElTorneo` no es por permiso sino por no ofrecer dos
  // caminos a la misma persona: quien organiza carga desde su pestaña
  // de Resultados, que además confirma de entrada (D-95).
  const puedeCargarResultado =
    !gestionaElTorneo &&
    !fila.solo_organizador_carga_resultados &&
    fila.torneo_estado === 'in_progress' &&
    ESTADOS_QUE_ESPERAN_RESULTADO.has(fila.estado) &&
    (await esCapitanDeAlgunEquipo(contexto, fila.equipo_local_id, fila.equipo_visitante_id));

  const { rows: alineados } = await pool.query<{
    perfil_id: string;
    nombre_visible: string;
    equipo_id: string;
    fue_titular: boolean;
  }>(
    `SELECT a.perfil_id, pd.nombre_visible, a.equipo_id, a.fue_titular
     FROM alineacion_partido a
     JOIN perfil_deportivo pd ON pd.id = a.perfil_id
     WHERE a.partido_id = $1
     ORDER BY a.fue_titular DESC, pd.nombre_visible ASC`,
    [datos.partidoId],
  );

  let habilitados: JugadorHabilitado[] = [];
  if (puedeCargarAlineacion) {
    const { rows: elegibles } = await pool.query<{
      perfil_id: string;
      nombre_visible: string;
      equipo_id: string;
      numero_camiseta: number | null;
    }>(
      `SELECT ih.perfil_id, pd.nombre_visible, ih.equipo_id, ih.numero_camiseta
       FROM integrante_habilitado ih
       JOIN perfil_deportivo pd ON pd.id = ih.perfil_id
       WHERE ih.torneo_id = $1 AND ih.equipo_id = ANY($2)
         AND ih.rol_en_torneo = 'player' AND ih.estado = 'eligible'
       ORDER BY ih.numero_camiseta ASC NULLS LAST, pd.nombre_visible ASC`,
      [fila.torneo_id, [fila.equipo_local_id, fila.equipo_visitante_id]],
    );
    habilitados = elegibles.map((e) => ({
      perfilId: e.perfil_id,
      nombreVisible: e.nombre_visible,
      equipoId: e.equipo_id,
      numeroCamiseta: e.numero_camiseta,
    }));
  }

  const confirmaSoloEl =
    fila.estado_resultado === 'loaded' && fila.fecha_carga_resultado
      ? new Date(
          fila.fecha_carga_resultado.getTime() +
            CONFIGURACION.horasConfirmacionAutomaticaResultado * 60 * 60 * 1000,
        ).toISOString()
      : null;

  return {
    id: fila.id,
    torneoId: fila.torneo_id,
    torneoNombre: fila.torneo_nombre,
    numeroFecha: fila.numero_fecha,
    estado: fila.estado,
    estadoResultado: fila.estado_resultado,
    version: fila.version,
    golesLocal: fila.goles_local,
    golesVisitante: fila.goles_visitante,
    local: {
      id: fila.equipo_local_id,
      nombre: fila.equipo_local_nombre,
      escudoUrl: fila.equipo_local_escudo,
    },
    visitante: {
      id: fila.equipo_visitante_id,
      nombre: fila.equipo_visitante_nombre,
      escudoUrl: fila.equipo_visitante_escudo,
    },
    fechaHoraProgramada: fila.fecha_hora_programada?.toISOString() ?? null,
    sedeNombre: fila.sede_nombre,
    cargadoPor: fila.cargado_por_nombre,
    fechaCargaResultado: fila.fecha_carga_resultado?.toISOString() ?? null,
    confirmaSoloEl,
    objecionAbierta: objecion
      ? {
          motivo: objecion.motivo,
          equipoId: objecion.equipo_id,
          fechaPresentacion: objecion.fecha_presentacion.toISOString(),
        }
      : null,
    alineacion: alineados.map((a) => ({
      perfilId: a.perfil_id,
      nombreVisible: a.nombre_visible,
      equipoId: a.equipo_id,
      fueTitular: a.fue_titular,
    })),
    puedeCargarAlineacion,
    puedeCargarResultado,
    habilitados,
    equipoQueRespondeId: equipoQueResponde,
    puedeResponder,
    puedeResolverObjecion,
  };
};
