import { randomUUID } from 'node:crypto';
import { obtenerPool } from '@/db/cliente';
import type { Contexto } from '@/lib/contexto';
import { crearOrganizacion } from '@/services/organizadores/crearOrganizacion';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';
import { crearTorneo } from '@/services/torneos/crearTorneo';
import { definirFormato } from '@/services/torneos/definirFormato';
import { publicarTorneo } from '@/services/torneos/publicarTorneo';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { invitarIntegrante } from '@/services/equipos/invitarIntegrante';
import { solicitarInscripcion } from '@/services/inscripciones/solicitarInscripcion';
import { resolverInscripcion } from '@/services/inscripciones/resolverInscripcion';
import { avanzarEstado } from '@/services/torneos/avanzarEstado';
import { generarFixture } from '@/services/fixture/generarFixture';
import { confirmarFixture } from '@/services/fixture/confirmarFixture';
import { cargarResultado } from '@/services/competencia/cargarResultado';

/**
 * Datos de prueba para recorrer los flujos en un ambiente ya desplegado
 * (pedido explícito: "cargá torneos y equipos con imágenes de prueba").
 *
 * Mismo criterio que `test/integracion/_escenarios.ts`: arma todo
 * llamando a los servicios reales (nunca INSERTs a mano para lo que un
 * servicio ya sabe crear), así que lo que queda en la base respeta
 * exactamente las mismas reglas que respetaría una carga real — la
 * única excepción es `usuario`/`perfil_deportivo` del organizador y de
 * los capitanes, igual que en los tests de integración: en producción
 * esas filas las crea Supabase Auth vía `completarRegistro`, no un
 * servicio de este backlog.
 *
 * Todo lo que crea lleva el prefijo "[DEMO]" en el nombre — para poder
 * encontrarlo y borrarlo fácil antes de abrir el producto a usuarios
 * reales (`DELETE FROM torneo WHERE nombre LIKE '[DEMO]%'`, etc., en el
 * orden de dependencias del esquema).
 *
 * Corre con la `DATABASE_URL` que ya tengas en el entorno — apuntá esa
 * variable a la base que quieras sembrar (local o la de Supabase) antes
 * de ejecutar:
 *
 *   DATABASE_URL="postgresql://...supabase..." npx tsx scripts/sembrar-demo.ts
 */

const AVATAR = (estilo: string, semilla: string) =>
  `https://api.dicebear.com/9.x/${estilo}/svg?seed=${encodeURIComponent(semilla)}`;

async function buscarCiudadId(
  pool: ReturnType<typeof obtenerPool>,
  ciudad: string,
  provincia: string,
) {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT c.id FROM ciudad c JOIN provincia p ON p.id = c.provincia_id
     WHERE c.nombre = $1 AND p.nombre = $2 LIMIT 1`,
    [ciudad, provincia],
  );
  if (!rows[0]) {
    throw new Error(
      `No encontré "${ciudad}" (${provincia}) en el catálogo — ¿corriste la migración de ciudades?`,
    );
  }
  return rows[0].id;
}

async function crearUsuarioDemo(
  pool: ReturnType<typeof obtenerPool>,
  nombre: string,
  fotoUrl?: string,
): Promise<{ usuarioId: string; contexto: Contexto }> {
  const email = `${randomUUID()}@demo.invicta.local`;
  const { rows: usuario } = await pool.query<{ id: string }>(
    `INSERT INTO usuario (email, nombre_completo, estado) VALUES ($1, $2, 'active') RETURNING id`,
    [email, nombre],
  );
  const usuarioId = usuario[0]!.id;
  const { rows: perfil } = await pool.query<{ id: string }>(
    `INSERT INTO perfil_deportivo (usuario_id, nombre_visible, foto_url, estado_reclamo, creado_por_usuario_id)
     VALUES ($1, $2, $3, 'claimed', $1) RETURNING id`,
    [usuarioId, nombre, fotoUrl ?? null],
  );
  await pool.query('UPDATE usuario SET perfil_deportivo_id = $1 WHERE id = $2', [
    perfil[0]!.id,
    usuarioId,
  ]);
  return { usuarioId, contexto: { usuarioId, permisos: {}, esSistema: false } };
}

const NOMBRES_EQUIPO = [
  'Atlético Unidos',
  'Deportivo Norte',
  'Los Pibes FC',
  'Racing del Barrio',
  'Estrella Roja',
  'Juventud Independiente',
  'Sportivo Belgrano Chico',
  'Defensores del Sur',
];

const NOMBRES_JUGADOR = [
  'Lautaro Gómez',
  'Nahuel Fernández',
  'Bruno Acosta',
  'Ezequiel Romero',
  'Tomás Silva',
  'Franco Díaz',
  'Agustín Torres',
  'Ignacio Molina',
];

interface DefinicionTorneo {
  organizacion: string;
  nombre: string;
  modalidad: 'f5' | 'f7' | 'f8' | 'f9' | 'f11';
  formato: 'league' | 'knockout' | 'groups_knockout';
  cupoEquipos: number;
  /** Menos que `cupoEquipos` dejar el cupo sin llenar, para probar el filtro "solo inscripciones abiertas". */
  equiposAInscribir: number;
  conResultados: boolean;
}

interface DefinicionCiudad {
  ciudad: string;
  provincia: string;
  torneos: DefinicionTorneo[];
}

/**
 * Una organización no verificada solo puede tener un torneo publicado a
 * la vez (`06`, D-51b) — por eso cada torneo de acá tiene su propia
 * organización, aunque compartan ciudad: es lo mismo que pasaría con
 * dos ligas reales operando en el mismo lugar.
 */
const CIUDADES: DefinicionCiudad[] = [
  {
    ciudad: 'Ciudad Autónoma de Buenos Aires',
    provincia: 'Ciudad Autónoma de Buenos Aires',
    torneos: [
      {
        organizacion: '[DEMO] Liga Amateur Central',
        nombre: '[DEMO] Apertura F5 Palermo',
        modalidad: 'f5',
        formato: 'league',
        cupoEquipos: 8,
        equiposAInscribir: 8,
        conResultados: true,
      },
      {
        organizacion: '[DEMO] Copa Invierno Porteña',
        nombre: '[DEMO] Copa Invierno F7',
        modalidad: 'f7',
        formato: 'knockout',
        cupoEquipos: 8,
        equiposAInscribir: 5,
        conResultados: false,
      },
    ],
  },
  {
    ciudad: 'La Plata',
    provincia: 'Buenos Aires',
    torneos: [
      {
        organizacion: '[DEMO] Club Social La Plata',
        nombre: '[DEMO] Liga Platense F8',
        modalidad: 'f8',
        formato: 'league',
        cupoEquipos: 8,
        equiposAInscribir: 8,
        conResultados: true,
      },
      {
        organizacion: '[DEMO] Copa Ciudad de La Plata',
        nombre: '[DEMO] Copa Ciudad F11',
        modalidad: 'f11',
        formato: 'groups_knockout',
        cupoEquipos: 8,
        equiposAInscribir: 6,
        conResultados: false,
      },
    ],
  },
  {
    ciudad: 'Rosario',
    provincia: 'Santa Fe',
    torneos: [
      {
        organizacion: '[DEMO] Liga Rosarina Amateur',
        nombre: '[DEMO] Torneo Clausura F5',
        modalidad: 'f5',
        formato: 'league',
        cupoEquipos: 8,
        equiposAInscribir: 8,
        conResultados: true,
      },
      {
        organizacion: '[DEMO] Copa Costanera Rosario',
        nombre: '[DEMO] Copa Costanera F9',
        modalidad: 'f9',
        formato: 'knockout',
        cupoEquipos: 8,
        equiposAInscribir: 4,
        conResultados: false,
      },
    ],
  },
  {
    ciudad: 'Córdoba',
    provincia: 'Córdoba',
    torneos: [
      {
        organizacion: '[DEMO] Liga Cordobesa Barrial',
        nombre: '[DEMO] Apertura F7 Nueva Córdoba',
        modalidad: 'f7',
        formato: 'league',
        cupoEquipos: 8,
        equiposAInscribir: 8,
        conResultados: true,
      },
      {
        organizacion: '[DEMO] Copa Sierras Córdoba',
        nombre: '[DEMO] Copa Sierras F5',
        modalidad: 'f5',
        formato: 'groups_knockout',
        cupoEquipos: 8,
        equiposAInscribir: 5,
        conResultados: false,
      },
    ],
  },
];

async function crearEquipoDemo(
  pool: ReturnType<typeof obtenerPool>,
  nombre: string,
  ciudadId: string,
  categoriaGenero: 'male' | 'female' | 'mixed',
  indice: number,
) {
  const capitan = await crearUsuarioDemo(
    pool,
    NOMBRES_JUGADOR[indice % NOMBRES_JUGADOR.length]!,
    AVATAR('personas', `capitan-${nombre}-${indice}`),
  );
  const equipo = await crearEquipo(
    {
      nombre: `${nombre} [DEMO]`,
      escudoUrl: AVATAR('shapes', nombre),
      categoriaGenero,
      ciudadId,
    },
    capitan.contexto,
  );
  // Un par de jugadores más en el plantel, sin cuenta propia (D-98: vínculo `active` directo).
  for (let j = 0; j < 3; j += 1) {
    await invitarIntegrante(
      {
        equipoId: equipo.id,
        roles: ['player'],
        nombreVisible: `${NOMBRES_JUGADOR[(indice + j + 1) % NOMBRES_JUGADOR.length]} (${nombre})`,
      },
      capitan.contexto,
    );
  }
  return { equipoId: equipo.id, capitanContexto: capitan.contexto };
}

async function main() {
  const pool = obtenerPool();

  for (const def of CIUDADES) {
    console.log(`\n=== ${def.ciudad} ===`);
    const ciudadId = await buscarCiudadId(pool, def.ciudad, def.provincia);

    for (const defTorneo of def.torneos) {
      const titular = await crearUsuarioDemo(pool, `Organizador ${defTorneo.organizacion}`);
      const organizacion = await crearOrganizacion(
        {
          nombre: defTorneo.organizacion,
          logoUrl: AVATAR('initials', defTorneo.organizacion),
          ciudadId,
        },
        titular.contexto,
      );
      // Sin esto el torneo publica en unlisted (D-51: solo verificada -> visible en descubrimiento).
      await confirmarVerificacionBasica({ organizacionId: organizacion.id }, titular.contexto);
      console.log(`  organización: ${defTorneo.organizacion} (${organizacion.id})`);

      const torneo = await crearTorneo(
        {
          organizacionId: organizacion.id,
          nombre: defTorneo.nombre,
          modalidad: defTorneo.modalidad,
          categoriaGenero: 'mixed',
          ciudadId,
          direccion: `Complejo deportivo demo, ${def.ciudad}`,
          formato: defTorneo.formato,
          cupoEquipos: defTorneo.cupoEquipos,
          fechaInicioEstimada: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        titular.contexto,
      );

      if (defTorneo.formato === 'groups_knockout') {
        await definirFormato(
          {
            torneoId: torneo.id,
            formato: 'groups_knockout',
            cantidadZonas: 2,
            clasificadosPorZona: 2,
          },
          titular.contexto,
        );
      } else {
        await definirFormato({ torneoId: torneo.id, formato: defTorneo.formato }, titular.contexto);
      }

      await publicarTorneo({ torneoId: torneo.id }, titular.contexto);

      for (let i = 0; i < defTorneo.equiposAInscribir; i += 1) {
        const nombreEquipo = `${NOMBRES_EQUIPO[i % NOMBRES_EQUIPO.length]} ${def.ciudad}`;
        const { equipoId, capitanContexto } = await crearEquipoDemo(
          pool,
          nombreEquipo,
          ciudadId,
          'mixed',
          i,
        );
        await solicitarInscripcion({ torneoId: torneo.id, equipoId }, capitanContexto);
        await resolverInscripcion(
          { torneoId: torneo.id, equipoId, decision: 'approved' },
          titular.contexto,
        );
      }

      console.log(`  torneo publicado: ${defTorneo.nombre} (${torneo.id})`);

      if (defTorneo.conResultados) {
        // El cupo completo puede haber cerrado la inscripción sola (T12) antes de este paso.
        const { rows: estadoRows } = await pool.query<{ estado: string }>(
          'SELECT estado FROM torneo WHERE id = $1',
          [torneo.id],
        );
        if (estadoRows[0]!.estado === 'registration_open') {
          await avanzarEstado(
            { torneoId: torneo.id, estadoDestino: 'registration_closed' },
            titular.contexto,
          );
        }

        const { rows: faseRows } = await pool.query<{ id: string }>(
          'SELECT id FROM fase WHERE torneo_id = $1 ORDER BY orden ASC LIMIT 1',
          [torneo.id],
        );
        const faseId = faseRows[0]!.id;

        const propuesta = await generarFixture({ faseId }, titular.contexto);
        await confirmarFixture(
          { faseId, partidos: propuesta.partidos, asignacionesGrupo: propuesta.asignacionesGrupo },
          titular.contexto,
        );
        await avanzarEstado(
          { torneoId: torneo.id, estadoDestino: 'in_progress' },
          titular.contexto,
        );

        const { rows: partidos } = await pool.query<{ id: string; version: number }>(
          'SELECT id, version FROM partido WHERE fase_id = $1 ORDER BY numero_fecha ASC',
          [faseId],
        );
        const aCargar = partidos.slice(0, Math.ceil(partidos.length / 2));
        for (let i = 0; i < aCargar.length; i += 1) {
          await cargarResultado(
            {
              partidoId: aCargar[i]!.id,
              version: aCargar[i]!.version,
              golesLocal: (i * 2 + 1) % 5,
              golesVisitante: (i * 3 + 2) % 4,
            },
            titular.contexto,
          );
        }
        console.log(`  resultados cargados: ${aCargar.length}/${partidos.length} partidos`);
      }
    }
  }

  console.log('\nListo. Todo lo creado lleva el prefijo "[DEMO]".');
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
