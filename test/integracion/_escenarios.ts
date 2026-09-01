import { randomUUID } from 'node:crypto';
import { obtenerPool } from '@/db/cliente';
import type { Contexto } from '@/lib/contexto';
import { crearOrganizacion } from '@/services/organizadores/crearOrganizacion';
import { crearTorneo } from '@/services/torneos/crearTorneo';
import { definirFormato } from '@/services/torneos/definirFormato';
import { publicarTorneo } from '@/services/torneos/publicarTorneo';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { solicitarInscripcion } from '@/services/inscripciones/solicitarInscripcion';
import { resolverInscripcion } from '@/services/inscripciones/resolverInscripcion';
import { generarFixture } from '@/services/fixture/generarFixture';
import { confirmarFixture } from '@/services/fixture/confirmarFixture';
import { avanzarEstado } from '@/services/torneos/avanzarEstado';

/**
 * T27 — Utilidades para armar escenarios de integración: "una
 * organización, un torneo, ocho equipos inscriptos, un fixture
 * generado" (Alcance técnico). Arman todo llamando a los servicios
 * reales contra Postgres real, nunca con INSERTs a mano — con una sola
 * excepción, deliberada: `usuario` y `ciudad`/`provincia`, que en
 * producción vienen de Supabase Auth y del catálogo de ARBA/INDEC
 * respectivamente, no de un servicio de este backlog.
 */

export interface UsuarioDePrueba {
  usuarioId: string;
  perfilId: string;
  contexto: Contexto;
}

export async function crearUsuarioDePrueba(nombre = 'Persona de prueba'): Promise<UsuarioDePrueba> {
  const pool = obtenerPool();
  const email = `${randomUUID()}@integracion.invictos.test`;
  const { rows: usuario } = await pool.query<{ id: string }>(
    `INSERT INTO usuario (email, nombre_completo, estado) VALUES ($1, $2, 'active') RETURNING id`,
    [email, nombre],
  );
  const usuarioId = usuario[0]!.id;
  const { rows: perfil } = await pool.query<{ id: string }>(
    `INSERT INTO perfil_deportivo (usuario_id, nombre_visible, estado_reclamo, creado_por_usuario_id)
     VALUES ($1, $2, 'claimed', $1) RETURNING id`,
    [usuarioId, nombre],
  );
  await pool.query('UPDATE usuario SET perfil_deportivo_id = $1 WHERE id = $2', [
    perfil[0]!.id,
    usuarioId,
  ]);
  return {
    usuarioId,
    perfilId: perfil[0]!.id,
    contexto: { usuarioId, permisos: {}, esSistema: false },
  };
}

export async function crearCiudadDePrueba(): Promise<string> {
  const pool = obtenerPool();
  const { rows: provincia } = await pool.query<{ id: string }>(
    `INSERT INTO provincia (nombre) VALUES ($1) RETURNING id`,
    [`Provincia de prueba ${randomUUID()}`],
  );
  const { rows: ciudad } = await pool.query<{ id: string }>(
    `INSERT INTO ciudad (provincia_id, nombre) VALUES ($1, $2) RETURNING id`,
    [provincia[0]!.id, `Ciudad de prueba ${randomUUID()}`],
  );
  return ciudad[0]!.id;
}

export interface EscenarioTorneo {
  ciudadId: string;
  titular: UsuarioDePrueba;
  organizacionId: string;
  torneoId: string;
}

/** Una organización y un torneo publicado (liga por default), con dirección y fecha ya cargadas para poder publicarse. */
export async function crearTorneoDePrueba(
  opciones: {
    formato?: 'league' | 'knockout' | 'groups_knockout';
    cupoEquipos?: number;
  } = {},
): Promise<EscenarioTorneo> {
  const titular = await crearUsuarioDePrueba('Organizador de prueba');
  const ciudadId = await crearCiudadDePrueba();
  const formato = opciones.formato ?? 'league';

  const organizacion = await crearOrganizacion(
    { nombre: `Organización de prueba ${randomUUID()}`, ciudadId },
    titular.contexto,
  );

  const torneo = await crearTorneo(
    {
      organizacionId: organizacion.id,
      nombre: `Torneo de prueba ${randomUUID()}`,
      modalidad: 'f5',
      categoriaGenero: 'mixed',
      ciudadId,
      direccion: 'Cancha de prueba 123',
      fechaInicioEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      formato,
      cupoEquipos: opciones.cupoEquipos ?? 8,
    },
    titular.contexto,
  );

  if (formato === 'groups_knockout') {
    await definirFormato(
      { torneoId: torneo.id, formato, cantidadZonas: 2, clasificadosPorZona: 2 },
      titular.contexto,
    );
  } else {
    await definirFormato({ torneoId: torneo.id, formato }, titular.contexto);
  }

  await publicarTorneo({ torneoId: torneo.id }, titular.contexto);

  return { ciudadId, titular, organizacionId: organizacion.id, torneoId: torneo.id };
}

export interface EquipoInscriptoDePrueba {
  capitan: UsuarioDePrueba;
  equipoId: string;
}

/** Crea `cantidad` equipos —cada uno con su propio capitán— y los inscribe y aprueba en el torneo. */
export async function inscribirEquipos(
  escenario: EscenarioTorneo,
  cantidad: number,
): Promise<EquipoInscriptoDePrueba[]> {
  const equipos: EquipoInscriptoDePrueba[] = [];
  for (let i = 0; i < cantidad; i += 1) {
    const capitan = await crearUsuarioDePrueba(`Capitán de prueba ${i + 1}`);
    const equipo = await crearEquipo(
      {
        nombre: `Equipo de prueba ${randomUUID()}`,
        categoriaGenero: 'mixed',
        ciudadId: escenario.ciudadId,
      },
      capitan.contexto,
    );
    await solicitarInscripcion(
      { torneoId: escenario.torneoId, equipoId: equipo.id },
      capitan.contexto,
    );
    await resolverInscripcion(
      { torneoId: escenario.torneoId, equipoId: equipo.id, decision: 'approved' },
      escenario.titular.contexto,
    );
    equipos.push({ capitan, equipoId: equipo.id });
  }
  return equipos;
}

/** Genera y confirma el fixture de la primera fase, y avanza el torneo hasta `in_progress`. */
export async function generarYConfirmarFixture(escenario: EscenarioTorneo): Promise<void> {
  const pool = obtenerPool();

  const { rows: torneoRows } = await pool.query<{ estado: string }>(
    'SELECT estado FROM torneo WHERE id = $1',
    [escenario.torneoId],
  );
  if (torneoRows[0]!.estado === 'registration_open') {
    await avanzarEstado(
      { torneoId: escenario.torneoId, estadoDestino: 'registration_closed' },
      escenario.titular.contexto,
    );
  }

  const { rows: faseRows } = await pool.query<{ id: string }>(
    'SELECT id FROM fase WHERE torneo_id = $1 ORDER BY orden ASC LIMIT 1',
    [escenario.torneoId],
  );
  const faseId = faseRows[0]!.id;

  const propuesta = await generarFixture({ faseId }, escenario.titular.contexto);
  await confirmarFixture(
    { faseId, partidos: propuesta.partidos, asignacionesGrupo: propuesta.asignacionesGrupo },
    escenario.titular.contexto,
  );

  await avanzarEstado(
    { torneoId: escenario.torneoId, estadoDestino: 'in_progress' },
    escenario.titular.contexto,
  );
}
