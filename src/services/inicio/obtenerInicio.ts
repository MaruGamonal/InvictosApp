import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';

/**
 * Pantalla de Inicio (paquete de diseño, `Invictos - Inicio.dc.html`):
 * junta en una sola consulta lo que la persona ve al abrir la app —
 * próximo partido, equipos y torneos propios si juega, torneos que
 * administra si organiza, y un estado aparte para quien recién se
 * registró y todavía no tiene nada de eso (`esRecienLlegado`).
 *
 * A diferencia del prototipo —que intercambia un bloque por otro con un
 * switch de modo— acá se devuelven los dos bloques juntos cuando
 * corresponden (alguien puede jugar y organizar a la vez) y es la
 * pantalla la que decide cuál mostrar primero.
 */

export interface ProximoPartido {
  torneoId: string;
  torneoNombre: string;
  numeroFecha: number;
  categoriaGenero: string;
  miEquipoId: string;
  miEquipoNombre: string;
  rivalId: string;
  rivalNombre: string;
  fechaHoraProgramada: string;
  sedeNombre: string | null;
}

export interface MiEquipo {
  id: string;
  nombre: string;
  categoriaGenero: string;
  escudoUrl: string | null;
  /** Una persona puede tener más de un rol activo en el mismo equipo (p. ej. jugadora y delegada). */
  rolesEquipo: string[];
}

export interface MiTorneo {
  torneoId: string;
  nombre: string;
  categoriaGenero: string;
  modalidad: string;
  /** Logo de la organización que lo organiza — el torneo en sí no tiene escudo propio. */
  imagenUrl: string | null;
  miEquipoId: string;
  miEquipoNombre: string;
  posicionActual: number | null;
}

export interface EquipoSeguido {
  id: string;
  nombre: string;
  categoriaGenero: string;
  escudoUrl: string | null;
}

export interface TorneoSeguido {
  id: string;
  nombre: string;
  categoriaGenero: string;
  modalidad: string;
  imagenUrl: string | null;
}

export interface TorneoAdministrado {
  id: string;
  nombre: string;
  categoriaGenero: string;
  modalidad: string;
  imagenUrl: string | null;
  estado: string;
  fechaInicioEstimada: string | null;
  inscriptos: number;
  cupoEquipos: number;
}

export interface InicioResultado {
  nombreUsuario: string;
  esJugador: boolean;
  esOrganizador: boolean;
  esRecienLlegado: boolean;
  jugador: {
    proximoPartido: ProximoPartido | null;
    equipos: MiEquipo[];
    torneos: MiTorneo[];
    equiposSeguidos: EquipoSeguido[];
    torneosSeguidos: TorneoSeguido[];
    resultadosPorConfirmar: number;
  } | null;
  organizador: {
    torneosAdministrados: TorneoAdministrado[];
    equiposSeguidos: EquipoSeguido[];
    torneosSeguidos: TorneoSeguido[];
    inscripcionesPendientes: number;
    resultadosSinCargar: number;
  } | null;
}

export const obtenerInicio: Servicio<void, InicioResultado> = async (_input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const pool = obtenerPool();

  const { rows: perfilRows } = await pool.query<{ id: string; nombre_visible: string }>(
    `SELECT id, nombre_visible FROM perfil_deportivo WHERE usuario_id = $1`,
    [contexto.usuarioId],
  );
  const perfil = perfilRows[0];
  if (!perfil) throw crearError('NO_ENCONTRADO');

  const { rows: equiposRows } = await pool.query<{
    id: string;
    nombre: string;
    categoria_genero: string;
    escudo_url: string | null;
    rol_equipo: string;
  }>(
    `SELECT e.id, e.nombre, e.categoria_genero, e.escudo_url, ie.rol_equipo
     FROM integrante_equipo ie
     JOIN equipo e ON e.id = ie.equipo_id
     WHERE ie.perfil_id = $1 AND ie.estado_vinculo = 'active' AND e.estado = 'active'
     ORDER BY e.nombre`,
    [perfil.id],
  );
  // Un rol activo por fila (`06`, D-23): agrupa antes de listar, para no
  // mostrar el mismo equipo dos veces si es jugadora y delegada a la vez.
  const misEquipos = new Map<string, MiEquipo>();
  for (const fila of equiposRows) {
    const existente = misEquipos.get(fila.id);
    if (existente) {
      existente.rolesEquipo.push(fila.rol_equipo);
      continue;
    }
    misEquipos.set(fila.id, {
      id: fila.id,
      nombre: fila.nombre,
      categoriaGenero: fila.categoria_genero,
      escudoUrl: fila.escudo_url,
      rolesEquipo: [fila.rol_equipo],
    });
  }
  const misEquiposIds = [...misEquipos.keys()];
  const esJugador = misEquiposIds.length > 0;

  const { rows: organizacionesRows } = await pool.query<{ organizacion_id: string }>(
    `SELECT organizacion_id FROM miembro_organizacion WHERE usuario_id = $1`,
    [contexto.usuarioId],
  );
  const misOrganizacionesIds = organizacionesRows.map((fila) => fila.organizacion_id);
  const esOrganizador = misOrganizacionesIds.length > 0;

  let bloqueJugador: InicioResultado['jugador'] = null;
  if (esJugador) {
    const { rows: partidoRows } = await pool.query<{
      torneo_id: string;
      torneo_nombre: string;
      numero_fecha: number;
      categoria_genero: string;
      equipo_local_id: string;
      equipo_local_nombre: string;
      equipo_visitante_id: string;
      equipo_visitante_nombre: string;
      fecha_hora_programada: Date;
      sede_nombre: string | null;
    }>(
      `SELECT p.torneo_id, t.nombre AS torneo_nombre, p.numero_fecha, t.categoria_genero,
              p.equipo_local_id, el.nombre AS equipo_local_nombre,
              p.equipo_visitante_id, ev.nombre AS equipo_visitante_nombre,
              p.fecha_hora_programada, s.nombre AS sede_nombre
       FROM partido p
       JOIN torneo t ON t.id = p.torneo_id
       JOIN equipo el ON el.id = p.equipo_local_id
       JOIN equipo ev ON ev.id = p.equipo_visitante_id
       LEFT JOIN sede s ON s.id = p.sede_id
       WHERE (p.equipo_local_id = ANY($1) OR p.equipo_visitante_id = ANY($1))
         AND p.estado = 'scheduled' AND p.fecha_hora_programada IS NOT NULL
       ORDER BY p.fecha_hora_programada ASC
       LIMIT 1`,
      [misEquiposIds],
    );
    const filaPartido = partidoRows[0];
    let proximoPartido: ProximoPartido | null = null;
    if (filaPartido) {
      const esLocal = misEquiposIds.includes(filaPartido.equipo_local_id);
      proximoPartido = {
        torneoId: filaPartido.torneo_id,
        torneoNombre: filaPartido.torneo_nombre,
        numeroFecha: filaPartido.numero_fecha,
        categoriaGenero: filaPartido.categoria_genero,
        miEquipoId: esLocal ? filaPartido.equipo_local_id : filaPartido.equipo_visitante_id,
        miEquipoNombre: esLocal
          ? filaPartido.equipo_local_nombre
          : filaPartido.equipo_visitante_nombre,
        rivalId: esLocal ? filaPartido.equipo_visitante_id : filaPartido.equipo_local_id,
        rivalNombre: esLocal
          ? filaPartido.equipo_visitante_nombre
          : filaPartido.equipo_local_nombre,
        fechaHoraProgramada: filaPartido.fecha_hora_programada.toISOString(),
        sedeNombre: filaPartido.sede_nombre,
      };
    }

    const { rows: torneosRows } = await pool.query<{
      torneo_id: string;
      nombre: string;
      categoria_genero: string;
      modalidad: string;
      organizacion_logo_url: string | null;
      equipo_id: string;
      equipo_nombre: string;
      posicion_actual: number | null;
    }>(
      `SELECT t.id AS torneo_id, t.nombre, t.categoria_genero, t.modalidad,
              o.logo_url AS organizacion_logo_url,
              i.equipo_id, e.nombre AS equipo_nombre, pos.posicion_actual
       FROM inscripcion i
       JOIN torneo t ON t.id = i.torneo_id
       JOIN organizacion o ON o.id = t.organizacion_id
       JOIN equipo e ON e.id = i.equipo_id
       LEFT JOIN posicion pos ON pos.grupo_id = i.grupo_id AND pos.equipo_id = i.equipo_id
       WHERE i.equipo_id = ANY($1) AND i.estado = 'approved'
         AND t.estado IN ('registration_open', 'registration_closed', 'in_progress', 'finished')
       ORDER BY t.fecha_inicio_estimada DESC NULLS LAST
       LIMIT 5`,
      [misEquiposIds],
    );

    const { rows: equiposSeguidosRows } = await pool.query<{
      id: string;
      nombre: string;
      categoria_genero: string;
      escudo_url: string | null;
    }>(
      `SELECT e.id, e.nombre, e.categoria_genero, e.escudo_url
       FROM seguimiento sg
       JOIN equipo e ON e.id = sg.entidad_seguida_id
       WHERE sg.usuario_id = $1 AND sg.tipo_seguido = 'team'
       ORDER BY sg.fecha_alta DESC
       LIMIT 5`,
      [contexto.usuarioId],
    );

    const { rows: torneosSeguidosRows } = await pool.query<{
      id: string;
      nombre: string;
      categoria_genero: string;
      modalidad: string;
      organizacion_logo_url: string | null;
    }>(
      `SELECT t.id, t.nombre, t.categoria_genero, t.modalidad, o.logo_url AS organizacion_logo_url
       FROM seguimiento sg
       JOIN torneo t ON t.id = sg.entidad_seguida_id
       JOIN organizacion o ON o.id = t.organizacion_id
       WHERE sg.usuario_id = $1 AND sg.tipo_seguido = 'tournament'
       ORDER BY sg.fecha_alta DESC
       LIMIT 5`,
      [contexto.usuarioId],
    );

    const { rows: pendientesRows } = await pool.query<{ cantidad: string }>(
      `SELECT count(*) AS cantidad
       FROM partido p
       WHERE (p.equipo_local_id = ANY($1) OR p.equipo_visitante_id = ANY($1))
         AND p.estado_resultado = 'loaded'
         AND p.cargado_por_usuario_id IS DISTINCT FROM $2`,
      [misEquiposIds, contexto.usuarioId],
    );

    bloqueJugador = {
      proximoPartido,
      equipos: [...misEquipos.values()],
      torneos: torneosRows.map((fila) => ({
        torneoId: fila.torneo_id,
        nombre: fila.nombre,
        categoriaGenero: fila.categoria_genero,
        modalidad: fila.modalidad,
        imagenUrl: fila.organizacion_logo_url,
        miEquipoId: fila.equipo_id,
        miEquipoNombre: fila.equipo_nombre,
        posicionActual: fila.posicion_actual,
      })),
      torneosSeguidos: torneosSeguidosRows.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        categoriaGenero: fila.categoria_genero,
        modalidad: fila.modalidad,
        imagenUrl: fila.organizacion_logo_url,
      })),
      equiposSeguidos: equiposSeguidosRows.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        categoriaGenero: fila.categoria_genero,
        escudoUrl: fila.escudo_url,
      })),
      resultadosPorConfirmar: Number(pendientesRows[0]?.cantidad ?? 0),
    };
  }

  let bloqueOrganizador: InicioResultado['organizador'] = null;
  if (esOrganizador) {
    const { rows: torneosAdmRows } = await pool.query<{
      id: string;
      nombre: string;
      categoria_genero: string;
      modalidad: string;
      organizacion_logo_url: string | null;
      estado: string;
      fecha_inicio_estimada: Date | null;
      cupo_equipos: number;
      inscriptos: string;
    }>(
      `SELECT t.id, t.nombre, t.categoria_genero, t.modalidad, o.logo_url AS organizacion_logo_url,
              t.estado, t.fecha_inicio_estimada, t.cupo_equipos,
              (SELECT count(*) FROM inscripcion i WHERE i.torneo_id = t.id AND i.estado = 'approved') AS inscriptos
       FROM torneo t
       JOIN organizacion o ON o.id = t.organizacion_id
       WHERE t.organizacion_id = ANY($1) AND t.estado != 'cancelled'
       ORDER BY (t.estado IN ('registration_open', 'in_progress')) DESC, t.fecha_inicio_estimada ASC NULLS LAST
       LIMIT 5`,
      [misOrganizacionesIds],
    );

    const { rows: equiposSeguidosOrgRows } = await pool.query<{
      id: string;
      nombre: string;
      categoria_genero: string;
      escudo_url: string | null;
    }>(
      `SELECT e.id, e.nombre, e.categoria_genero, e.escudo_url
       FROM seguimiento sg
       JOIN equipo e ON e.id = sg.entidad_seguida_id
       WHERE sg.usuario_id = $1 AND sg.tipo_seguido = 'team'
       ORDER BY sg.fecha_alta DESC
       LIMIT 5`,
      [contexto.usuarioId],
    );

    const { rows: torneosSeguidosOrgRows } = await pool.query<{
      id: string;
      nombre: string;
      categoria_genero: string;
      modalidad: string;
      organizacion_logo_url: string | null;
    }>(
      `SELECT t.id, t.nombre, t.categoria_genero, t.modalidad, o.logo_url AS organizacion_logo_url
       FROM seguimiento sg
       JOIN torneo t ON t.id = sg.entidad_seguida_id
       JOIN organizacion o ON o.id = t.organizacion_id
       WHERE sg.usuario_id = $1 AND sg.tipo_seguido = 'tournament'
       ORDER BY sg.fecha_alta DESC
       LIMIT 5`,
      [contexto.usuarioId],
    );

    const { rows: inscripcionesPendRows } = await pool.query<{ cantidad: string }>(
      `SELECT count(*) AS cantidad FROM inscripcion i
       JOIN torneo t ON t.id = i.torneo_id
       WHERE t.organizacion_id = ANY($1) AND i.estado = 'pending'`,
      [misOrganizacionesIds],
    );

    const { rows: resultadosSinCargarRows } = await pool.query<{ cantidad: string }>(
      `SELECT count(*) AS cantidad FROM partido p
       JOIN torneo t ON t.id = p.torneo_id
       WHERE t.organizacion_id = ANY($1) AND p.estado = 'scheduled'
         AND p.fecha_hora_programada < now() AND p.estado_resultado = 'pending'`,
      [misOrganizacionesIds],
    );

    bloqueOrganizador = {
      torneosAdministrados: torneosAdmRows.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        categoriaGenero: fila.categoria_genero,
        modalidad: fila.modalidad,
        imagenUrl: fila.organizacion_logo_url,
        estado: fila.estado,
        fechaInicioEstimada: fila.fecha_inicio_estimada?.toISOString() ?? null,
        inscriptos: Number(fila.inscriptos),
        cupoEquipos: fila.cupo_equipos,
      })),
      equiposSeguidos: equiposSeguidosOrgRows.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        categoriaGenero: fila.categoria_genero,
        escudoUrl: fila.escudo_url,
      })),
      torneosSeguidos: torneosSeguidosOrgRows.map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        categoriaGenero: fila.categoria_genero,
        modalidad: fila.modalidad,
        imagenUrl: fila.organizacion_logo_url,
      })),
      inscripcionesPendientes: Number(inscripcionesPendRows[0]?.cantidad ?? 0),
      resultadosSinCargar: Number(resultadosSinCargarRows[0]?.cantidad ?? 0),
    };
  }

  return {
    nombreUsuario: perfil.nombre_visible,
    esJugador,
    esOrganizador,
    esRecienLlegado: !esJugador && !esOrganizador,
    jugador: bloqueJugador,
    organizador: bloqueOrganizador,
  };
};
