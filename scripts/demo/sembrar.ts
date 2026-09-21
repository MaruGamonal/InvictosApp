import { obtenerPool } from '@/db/cliente';
import type { Contexto } from '@/lib/contexto';
import { crearOrganizacion } from '@/services/organizadores/crearOrganizacion';
import { confirmarVerificacionBasica } from '@/services/organizadores/confirmarVerificacionBasica';
import { crearTorneo } from '@/services/torneos/crearTorneo';
import { definirFormato } from '@/services/torneos/definirFormato';
import { publicarTorneo } from '@/services/torneos/publicarTorneo';
import { avanzarEstado } from '@/services/torneos/avanzarEstado';
import { agregarDivision } from '@/services/torneos/agregarDivision';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { invitarIntegrante } from '@/services/equipos/invitarIntegrante';
import { responderInvitacion } from '@/services/equipos/responderInvitacion';
import { solicitarIngreso } from '@/services/equipos/solicitarIngreso';
import { solicitarInscripcion } from '@/services/inscripciones/solicitarInscripcion';
import { resolverInscripcion } from '@/services/inscripciones/resolverInscripcion';
import { confirmarPlantel } from '@/services/inscripciones/confirmarPlantel';
import { generarFixture } from '@/services/fixture/generarFixture';
import { confirmarFixture } from '@/services/fixture/confirmarFixture';
import { cargarResultado, type EventoResultadoInput } from '@/services/competencia/cargarResultado';
import { seguir } from '@/services/notificaciones/seguir';
import {
  crearUsuarioDemo,
  hayCredencialesDeAuth,
  PASSWORD_DEMO,
  type UsuarioDemo,
} from './_identidad';

/**
 * Dataset de desarrollo de INVICTA, armado sobre el modelo actual.
 *
 * Criterio, igual que `test/integracion/_escenarios.ts`: **todo pasa por
 * los servicios reales**, nunca por INSERTs a mano de lo que un servicio
 * sabe crear. Lo que queda en la base respeta entonces las mismas reglas
 * que respetaría una carga hecha a mano desde la aplicación — si un
 * servicio rechaza algo, el seed falla en vez de dejar un estado que la
 * aplicación no podría haber producido. Las dos excepciones, ambas
 * anotadas donde ocurren, son la imagen del torneo (que en la aplicación
 * llega por subida de archivo) y el alta del Administrador de la
 * organización (cuyo servicio manda un correo de verdad).
 *
 * Todo lo creado lleva `[DEMO]` en el nombre y las cuentas usan el
 * dominio `@demo.invicta.com.ar`, que es lo que `limpiar.ts` usa para
 * poder borrarlo sin tocar nada real.
 *
 * Correrlo:
 *   npm run demo:sembrar
 */

const IMAGEN = (estilo: string, semilla: string) =>
  `https://api.dicebear.com/9.x/${estilo}/svg?seed=${encodeURIComponent(semilla)}`;

const EN_DIAS = (dias: number) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

async function buscarCiudadId(ciudad: string, provincia: string): Promise<string> {
  const { rows } = await obtenerPool().query<{ id: string }>(
    `SELECT c.id FROM ciudad c JOIN provincia p ON p.id = c.provincia_id
     WHERE c.nombre = $1 AND p.nombre = $2 LIMIT 1`,
    [ciudad, provincia],
  );
  if (!rows[0]) {
    throw new Error(`No encontré "${ciudad}" (${provincia}) — ¿corriste las migraciones?`);
  }
  return rows[0].id;
}

interface EquipoDemo {
  id: string;
  nombre: string;
  capitan: UsuarioDemo;
  /**
   * Jugadores del plantel (sin el capitán), que son los que van a la
   * lista de buena fe y pueden ser jugador del partido.
   *
   * El capitán queda afuera a propósito: varios equipos demo comparten
   * capitán —no tendría sentido inventar veinte cuentas— y el torneo
   * prohíbe habilitar a la misma persona en dos equipos suyos
   * (`JUGADOR_YA_HABILITADO_EN_EL_TORNEO`). Un capitán que dirige sin
   * jugar es una figura normal igual.
   */
  perfilIds: string[];
}

async function crearEquipoDemo(opciones: {
  capitan: UsuarioDemo;
  nombre: string;
  ciudadId: string;
  categoriaGenero: 'male' | 'female' | 'mixed';
  modalidadHabitual?: 'f5' | 'f7' | 'f8' | 'f9' | 'f11';
  jugadores: string[];
}): Promise<EquipoDemo> {
  const nombre = `${opciones.nombre} [DEMO]`;
  const equipo = await crearEquipo(
    {
      nombre,
      escudoUrl: IMAGEN('shapes', opciones.nombre),
      categoriaGenero: opciones.categoriaGenero,
      ciudadId: opciones.ciudadId,
      ...(opciones.modalidadHabitual ? { modalidadHabitual: opciones.modalidadHabitual } : {}),
    },
    opciones.capitan.contexto,
  );

  // D-98: una persona sin cuenta entra directo al plantel (`active`), no
  // hay a quién pedirle consentimiento.
  const perfilIds: string[] = [];
  for (const jugador of opciones.jugadores) {
    const { perfilId } = await invitarIntegrante(
      { equipoId: equipo.id, roles: ['player'], nombreVisible: `${jugador} [DEMO]` },
      opciones.capitan.contexto,
    );
    perfilIds.push(perfilId);
  }

  return { id: equipo.id, nombre, capitan: opciones.capitan, perfilIds };
}

/** Inscribe el equipo y lo aprueba, que es como llega a jugar de verdad. */
async function inscribirEquipo(
  torneoId: string,
  equipo: EquipoDemo,
  organizador: Contexto,
): Promise<void> {
  await solicitarInscripcion({ torneoId, equipoId: equipo.id }, equipo.capitan.contexto);
  await resolverInscripcion({ torneoId, equipoId: equipo.id, decision: 'approved' }, organizador);
}

/**
 * Lista de buena fe. Sin esto `integrante_habilitado` queda vacío y el
 * jugador del partido y los goles por jugador son imposibles de cargar
 * (`cargarResultado` exige que la persona esté habilitada) — era
 * justamente el agujero del seed anterior.
 */
async function confirmarPlantelDemo(torneoId: string, equipo: EquipoDemo): Promise<void> {
  await confirmarPlantel(
    {
      torneoId,
      equipoId: equipo.id,
      integrantes: equipo.perfilIds.map((perfilId, indice) => ({
        perfilId,
        rolEnTorneo: 'player' as const,
        numeroCamiseta: indice + 1,
      })),
    },
    equipo.capitan.contexto,
  );
}

async function ponerEnCurso(torneoId: string, organizador: Contexto): Promise<string> {
  const pool = obtenerPool();
  const { rows: estado } = await pool.query<{ estado: string }>(
    'SELECT estado FROM torneo WHERE id = $1',
    [torneoId],
  );
  // Llenar el cupo cierra la inscripción solo (T12): solo hay que cerrarla si sigue abierta.
  if (estado[0]!.estado === 'registration_open') {
    await avanzarEstado({ torneoId, estadoDestino: 'registration_closed' }, organizador);
  }

  const { rows: fases } = await pool.query<{ id: string }>(
    'SELECT id FROM fase WHERE torneo_id = $1 ORDER BY orden ASC LIMIT 1',
    [torneoId],
  );
  const faseId = fases[0]!.id;

  const propuesta = await generarFixture({ faseId }, organizador);
  await confirmarFixture(
    { faseId, partidos: propuesta.partidos, asignacionesGrupo: propuesta.asignacionesGrupo },
    organizador,
  );
  await avanzarEstado({ torneoId, estadoDestino: 'in_progress' }, organizador);
  return faseId;
}

interface ResultadoPlan {
  golesLocal: number;
  golesVisitante: number;
}

/**
 * Carga resultados con goles por jugador y jugador del partido, para que
 * la tabla, las estadísticas y el feed salgan de hechos reales y no de
 * números puestos a mano.
 */
async function cargarResultados(
  faseId: string,
  organizador: Contexto,
  porEquipo: Map<string, EquipoDemo>,
  plan: (indice: number) => ResultadoPlan | null,
): Promise<number> {
  const pool = obtenerPool();
  const { rows: partidos } = await pool.query<{
    id: string;
    version: number;
    equipo_local_id: string;
    equipo_visitante_id: string;
  }>(
    `SELECT id, version, equipo_local_id, equipo_visitante_id
     FROM partido WHERE fase_id = $1 ORDER BY numero_fecha ASC, id ASC`,
    [faseId],
  );

  let cargados = 0;
  for (let i = 0; i < partidos.length; i += 1) {
    const marcador = plan(i);
    if (!marcador) continue;
    const partido = partidos[i]!;
    const local = porEquipo.get(partido.equipo_local_id);
    const visitante = porEquipo.get(partido.equipo_visitante_id);

    // Un gol por cada tanto, repartido entre jugadores habilitados del equipo que anotó.
    const eventos: EventoResultadoInput[] = [
      ...Array.from({ length: marcador.golesLocal }, (_, g) => ({
        perfilId: local!.perfilIds[g % local!.perfilIds.length]!,
        equipoId: partido.equipo_local_id,
        tipoEvento: 'goal' as const,
        minuto: 10 + g * 7,
      })),
      ...Array.from({ length: marcador.golesVisitante }, (_, g) => ({
        perfilId: visitante!.perfilIds[g % visitante!.perfilIds.length]!,
        equipoId: partido.equipo_visitante_id,
        tipoEvento: 'goal' as const,
        minuto: 15 + g * 9,
      })),
    ];
    // Una amarilla cada tres partidos, para que las estadísticas no sean solo goles.
    if (i % 3 === 0) {
      eventos.push({
        perfilId: visitante!.perfilIds[0]!,
        equipoId: partido.equipo_visitante_id,
        tipoEvento: 'yellow_card',
        minuto: 63,
      });
    }

    // Jugador del partido: del equipo que ganó (o el local si empataron).
    const ganador = marcador.golesLocal >= marcador.golesVisitante ? local! : visitante!;

    await cargarResultado(
      {
        partidoId: partido.id,
        version: partido.version,
        golesLocal: marcador.golesLocal,
        golesVisitante: marcador.golesVisitante,
        eventos,
        jugadorDelPartidoPerfilId: ganador.perfilIds[i % ganador.perfilIds.length]!,
      },
      organizador,
    );
    cargados += 1;
  }
  return cargados;
}

/** La imagen del torneo llega por subida de archivo en la aplicación; un script no puede subir nada. */
async function ponerImagenTorneo(torneoId: string, semilla: string): Promise<void> {
  await obtenerPool().query('UPDATE torneo SET imagen_url = $1 WHERE id = $2', [
    IMAGEN('shapes', semilla),
    torneoId,
  ]);
}

export async function sembrarDemo(): Promise<void> {
  const pool = obtenerPool();
  console.log(
    hayCredencialesDeAuth()
      ? 'Modo con Supabase Auth: las cuentas demo van a poder iniciar sesión.\n'
      : 'Sin credenciales de Supabase: creo solo las filas de la base.\n' +
          'Los datos se van a ver, pero NO se va a poder iniciar sesión como los usuarios demo.\n',
  );

  const caba = await buscarCiudadId(
    'Ciudad Autónoma de Buenos Aires',
    'Ciudad Autónoma de Buenos Aires',
  );
  const rosario = await buscarCiudadId('Rosario', 'Santa Fe');
  const posadas = await buscarCiudadId('Posadas', 'Misiones');

  // ---------------------------------------------------------------- gente
  console.log('=== Usuarios ===');
  const organizador = await crearUsuarioDemo({
    usuario: 'organizador',
    nombre: 'Marina Ferreyra',
    fotoUrl: IMAGEN('personas', 'marina'),
  });
  const adminOrg = await crearUsuarioDemo({
    usuario: 'admin',
    nombre: 'Diego Sosa',
    fotoUrl: IMAGEN('personas', 'diego'),
  });
  const capitana = await crearUsuarioDemo({
    usuario: 'capitana',
    nombre: 'Vale Ibarra',
    fotoUrl: IMAGEN('personas', 'vale'),
  });
  const capitan = await crearUsuarioDemo({
    usuario: 'capitan',
    nombre: 'Nico Peralta',
    fotoUrl: IMAGEN('personas', 'nico'),
  });
  const jugador = await crearUsuarioDemo({
    usuario: 'jugador',
    nombre: 'Tomás Ledesma',
    fotoUrl: IMAGEN('personas', 'tomas'),
  });
  const delegada = await crearUsuarioDemo({
    usuario: 'delegada',
    nombre: 'Ana Quiroga',
    fotoUrl: IMAGEN('personas', 'ana'),
  });
  const seguidor = await crearUsuarioDemo({
    usuario: 'seguidor',
    nombre: 'Pablo Ruiz',
    fotoUrl: IMAGEN('personas', 'pablo'),
  });
  const solicitante = await crearUsuarioDemo({
    usuario: 'solicitante',
    nombre: 'Iván Cabrera',
    fotoUrl: IMAGEN('personas', 'ivan'),
  });
  const rival = await crearUsuarioDemo({ usuario: 'rival', nombre: 'Lucas Medina' });
  const capitanRosario = await crearUsuarioDemo({
    usuario: 'capitan.rosario',
    nombre: 'Sole Vargas',
  });
  const capitanPosadas = await crearUsuarioDemo({
    usuario: 'capitan.posadas',
    nombre: 'Ramón Duarte',
  });
  // A propósito sin confirmar: es el estado que bloquea crear equipo,
  // crear torneo y pedir sumarse (`verificarCuentaConfirmada`).
  const sinConfirmar = await crearUsuarioDemo({
    usuario: 'sinconfirmar',
    nombre: 'Sofía Núñez',
    confirmado: false,
  });
  console.log(`  ${13} cuentas demo`);

  // -------------------------------------------------------- organizaciones
  console.log('\n=== Organizaciones ===');
  const ligaCentral = await crearOrganizacion(
    {
      nombre: '[DEMO] Liga Amateur Central',
      logoUrl: IMAGEN('initials', 'Liga Central'),
      ciudadId: caba,
    },
    organizador.contexto,
  );
  // Sin verificar, el torneo publica como `unlisted` y no aparece en descubrimiento (D-51).
  await confirmarVerificacionBasica({ organizacionId: ligaCentral.id }, organizador.contexto);

  const ligaLitoral = await crearOrganizacion(
    {
      nombre: '[DEMO] Liga del Litoral',
      logoUrl: IMAGEN('initials', 'Liga Litoral'),
      ciudadId: rosario,
    },
    organizador.contexto,
  );
  await confirmarVerificacionBasica({ organizacionId: ligaLitoral.id }, organizador.contexto);

  // Excepción anotada: `invitarMiembro` manda un correo real de invitación,
  // y un seed no puede mandar correos. El vínculo se escribe directo para
  // dejar disponible el rol de Administrador (no titular).
  await pool.query(
    `INSERT INTO miembro_organizacion (usuario_id, organizacion_id, rol) VALUES ($1, $2, 'admin')`,
    [adminOrg.usuarioId, ligaCentral.id],
  );
  console.log('  2 organizaciones verificadas (+1 administrador no titular)');

  // ------------------------------------------------------------- equipos
  console.log('\n=== Equipos ===');
  // Cada jugador demo es una persona distinta con nombre distinto. Repetir
  // el mismo nombre entre equipos daba perfiles válidos pero ilegibles: en
  // la tabla de goleadores aparecía tres veces "Lautaro Gómez", uno por
  // equipo, y no había forma de saber que eran tres personas diferentes.
  const NOMBRES_F = [
    'Carla',
    'Rocío',
    'Malena',
    'Julia',
    'Brenda',
    'Sol',
    'Pili',
    'Agus',
    'Mora',
    'Lucía',
    'Abril',
    'Nina',
  ];
  const NOMBRES_M = [
    'Bruno',
    'Ezequiel',
    'Franco',
    'Ignacio',
    'Juan',
    'Lautaro',
    'Nahuel',
    'Tomás',
    'Iván',
    'Ramiro',
    'Joaco',
    'Thiago',
  ];
  const APELLIDOS = [
    'Acosta',
    'Romero',
    'Díaz',
    'Molina',
    'Vera',
    'Gómez',
    'Aguirre',
    'Costa',
    'Márquez',
    'Rey',
    'Ojeda',
    'Paz',
    'Ríos',
    'Sosa',
    'Benítez',
    'Ledesma',
    'Quiroga',
    'Cabrera',
    'Ferreyra',
    'Vargas',
  ];

  const yaUsados = new Set<string>();
  let contador = 0;
  /**
   * Entrega nombres sin repetir en todo el dataset. Se apoya en un
   * conjunto y no en una fórmula: las combinaciones cíclicas de
   * nombre × apellido vuelven a chocar cada tanto, y acá lo único que
   * importa es que no haya dos personas con el mismo nombre.
   */
  const plantel = (cantidad: number, genero: 'female' | 'male' | 'mixed'): string[] =>
    Array.from({ length: cantidad }, () => {
      for (;;) {
        const pilaNombres =
          genero === 'female'
            ? NOMBRES_F
            : genero === 'male'
              ? NOMBRES_M
              : contador % 2 === 0
                ? NOMBRES_F
                : NOMBRES_M;
        const candidato = `${pilaNombres[contador % pilaNombres.length]} ${
          APELLIDOS[Math.floor(contador / pilaNombres.length) % APELLIDOS.length]
        }`;
        contador += 1;
        if (!yaUsados.has(candidato)) {
          yaUsados.add(candidato);
          return candidato;
        }
      }
    });

  // Femeninos — para la Copa Femenina
  const defemi = await crearEquipoDemo({
    capitan: capitana,
    nombre: 'Defemi Bordó',
    ciudadId: caba,
    categoriaGenero: 'female',
    modalidadHabitual: 'f7',
    jugadores: plantel(5, 'female'),
  });
  const lasPibas = await crearEquipoDemo({
    capitan: capitana,
    nombre: 'Las Pibas FC',
    ciudadId: caba,
    categoriaGenero: 'female',
    jugadores: plantel(4, 'female'),
  });
  const racingFem = await crearEquipoDemo({
    capitan: rival,
    nombre: 'Racing Femenino Sur',
    ciudadId: caba,
    categoriaGenero: 'female',
    jugadores: plantel(4, 'female'),
  });
  const estrellaFem = await crearEquipoDemo({
    capitan: rival,
    nombre: 'Estrella Roja Femenino',
    ciudadId: caba,
    categoriaGenero: 'female',
    jugadores: plantel(3, 'female'),
  });

  // Masculinos — para la Liga Masculina (la que termina con campeón)
  const atletico = await crearEquipoDemo({
    capitan: capitan,
    nombre: 'Atlético Unidos',
    ciudadId: caba,
    categoriaGenero: 'male',
    modalidadHabitual: 'f11',
    jugadores: plantel(5, 'male'),
  });
  const norte = await crearEquipoDemo({
    capitan: rival,
    nombre: 'Deportivo Norte',
    ciudadId: caba,
    categoriaGenero: 'male',
    jugadores: plantel(4, 'male'),
  });
  const palermo = await crearEquipoDemo({
    capitan: rival,
    nombre: 'Sportivo Palermo',
    ciudadId: caba,
    categoriaGenero: 'male',
    jugadores: plantel(4, 'male'),
  });
  const villaCrespo = await crearEquipoDemo({
    capitan: rival,
    nombre: 'Club Villa Crespo',
    ciudadId: caba,
    categoriaGenero: 'male',
    jugadores: plantel(4, 'male'),
  });

  // Mixtos — para el torneo en curso
  const pibesFondo = await crearEquipoDemo({
    capitan: capitan,
    nombre: 'Los Pibes del Fondo',
    ciudadId: caba,
    categoriaGenero: 'mixed',
    modalidadHabitual: 'f5',
    jugadores: plantel(5, 'mixed'),
  });
  const juventud = await crearEquipoDemo({
    capitan: capitana,
    nombre: 'Juventud Independiente',
    ciudadId: caba,
    categoriaGenero: 'mixed',
    jugadores: plantel(4, 'mixed'),
  });
  const defensores = await crearEquipoDemo({
    capitan: rival,
    nombre: 'Defensores del Sur',
    ciudadId: caba,
    categoriaGenero: 'mixed',
    jugadores: plantel(4, 'mixed'),
  });
  const barrioParque = await crearEquipoDemo({
    capitan: rival,
    nombre: 'Barrio Parque FC',
    ciudadId: caba,
    categoriaGenero: 'mixed',
    jugadores: plantel(4, 'mixed'),
  });

  // Equipo sin plantel: el estado vacío del perfil de equipo.
  const sinPlantel = await crearEquipoDemo({
    capitan: capitan,
    nombre: 'Racing del Barrio',
    ciudadId: caba,
    categoriaGenero: 'mixed',
    jugadores: [],
  });

  // Rosario y Posadas
  const equiposRosario: EquipoDemo[] = [];
  for (const nombre of [
    'Costanera FC',
    'Deportivo Pichincha',
    'Atlético Fisherton',
    'Unión Rosarina',
  ]) {
    equiposRosario.push(
      await crearEquipoDemo({
        capitan: capitanRosario,
        nombre,
        ciudadId: rosario,
        categoriaGenero: 'mixed',
        jugadores: plantel(4, 'mixed'),
      }),
    );
  }
  const equiposPosadas: EquipoDemo[] = [];
  for (const nombre of [
    'Itaembé Miní FC',
    'Deportivo Villa Cabello',
    'Atlético Garupá',
    'Costanera Posadas',
  ]) {
    equiposPosadas.push(
      await crearEquipoDemo({
        capitan: capitanPosadas,
        nombre,
        ciudadId: posadas,
        categoriaGenero: 'mixed',
        jugadores: plantel(3, 'mixed'),
      }),
    );
  }
  console.log('  21 equipos (femeninos, masculinos y mixtos, en 3 ciudades)');

  // ------------------------------------------- vínculos de plantel con cuenta
  // `jugador` y `delegada` sí tienen cuenta: entran por el camino real
  // (invitación + aceptación), no como perfiles sueltos.
  await invitarIntegrante(
    { equipoId: pibesFondo.id, roles: ['player'], perfilId: jugador.perfilId },
    capitan.contexto,
  );
  await responderInvitacion({ equipoId: pibesFondo.id, aceptar: true }, jugador.contexto);
  pibesFondo.perfilIds.push(jugador.perfilId);

  await invitarIntegrante(
    { equipoId: defemi.id, roles: ['delegate'], perfilId: delegada.perfilId },
    capitana.contexto,
  );
  await responderInvitacion({ equipoId: defemi.id, aceptar: true }, delegada.contexto);

  // Solicitud de ingreso pendiente, para la pantalla de solicitudes del capitán.
  await solicitarIngreso({ equipoId: pibesFondo.id }, solicitante.contexto);
  console.log('  1 jugador y 1 delegada con cuenta + 1 solicitud de ingreso pendiente');

  // ------------------------------------------------------------ seguidores
  // Antes de que pasen las cosas: así las notificaciones informativas
  // (publicado / empezó / resultado) le llegan y el feed tiene material.
  for (const equipo of [defemi, atletico, pibesFondo]) {
    await seguir({ tipoSeguido: 'team', entidadId: equipo.id }, seguidor.contexto);
  }
  await seguir({ tipoSeguido: 'team', entidadId: defemi.id }, jugador.contexto);
  console.log('  seguidores iniciales cargados');

  // -------------------------------------------------------------- torneos
  console.log('\n=== Torneos ===');
  const torneosCreados: Array<{ nombre: string; estado: string }> = [];

  /** 1. En curso, con resultados, tabla, estadísticas y jugador del partido. */
  const enCurso = await crearTorneo(
    {
      organizacionId: ligaCentral.id,
      nombre: '[DEMO] Apertura Palermo F5',
      descripcion: 'Torneo de prueba en curso, con resultados cargados y tabla viva.',
      modalidad: 'f5',
      categoriaGenero: 'mixed',
      ciudadId: caba,
      direccion: 'Complejo Palermo, Av. Dorrego 3200',
      formato: 'league',
      cupoEquipos: 4,
      costoInscripcion: 45000,
      costoPlanilla: 6000,
      fechaInicioEstimada: EN_DIAS(-20),
      fechaFinEstimada: EN_DIAS(20),
    },
    organizador.contexto,
  );
  await definirFormato({ torneoId: enCurso.id, formato: 'league' }, organizador.contexto);
  await ponerImagenTorneo(enCurso.id, 'apertura-palermo');
  await publicarTorneo({ torneoId: enCurso.id }, organizador.contexto);
  const equiposEnCurso = [pibesFondo, juventud, defensores, barrioParque];
  for (const equipo of equiposEnCurso) {
    await inscribirEquipo(enCurso.id, equipo, organizador.contexto);
    await confirmarPlantelDemo(enCurso.id, equipo);
  }
  const faseEnCurso = await ponerEnCurso(enCurso.id, organizador.contexto);
  const cargadosEnCurso = await cargarResultados(
    faseEnCurso,
    organizador.contexto,
    new Map(equiposEnCurso.map((e) => [e.id, e])),
    // Cuatro de seis: quedan partidos por jugar, que es lo que hace que
    // "próximo partido" y "último resultado" tengan los dos algo que mostrar.
    (i) => (i < 4 ? { golesLocal: (i + 3) % 4, golesVisitante: (i + 1) % 3 } : null),
  );
  torneosCreados.push({
    nombre: '[DEMO] Apertura Palermo F5',
    estado: `in_progress (${cargadosEnCurso}/6 jugados)`,
  });
  console.log(`  en curso: [DEMO] Apertura Palermo F5 — ${cargadosEnCurso}/6 partidos jugados`);

  /** 2. Finalizado, con campeón. */
  const finalizado = await crearTorneo(
    {
      organizacionId: ligaCentral.id,
      nombre: '[DEMO] Liga Masculina Norte F11',
      descripcion: 'Torneo de prueba ya terminado, con campeón y estadísticas finales.',
      modalidad: 'f11',
      categoriaGenero: 'male',
      ciudadId: caba,
      direccion: 'Predio Norte, Av. Cabildo 4100',
      formato: 'league',
      cupoEquipos: 4,
      costoInscripcion: 80000,
      fechaInicioEstimada: EN_DIAS(-90),
      fechaFinEstimada: EN_DIAS(-10),
    },
    organizador.contexto,
  );
  await definirFormato({ torneoId: finalizado.id, formato: 'league' }, organizador.contexto);
  await ponerImagenTorneo(finalizado.id, 'liga-norte');
  await publicarTorneo({ torneoId: finalizado.id }, organizador.contexto);
  const equiposFinalizado = [atletico, norte, palermo, villaCrespo];
  for (const equipo of equiposFinalizado) {
    await inscribirEquipo(finalizado.id, equipo, organizador.contexto);
    await confirmarPlantelDemo(finalizado.id, equipo);
  }
  const faseFinalizado = await ponerEnCurso(finalizado.id, organizador.contexto);
  await cargarResultados(
    faseFinalizado,
    organizador.contexto,
    new Map(equiposFinalizado.map((e) => [e.id, e])),
    // Todos jugados, y el primer equipo gana siempre que es local: hay campeón sin empate en la cima.
    (i) => ({ golesLocal: i % 2 === 0 ? 3 : 1, golesVisitante: i % 2 === 0 ? 1 : 2 }),
  );
  await avanzarEstado({ torneoId: finalizado.id, estadoDestino: 'finished' }, organizador.contexto);
  torneosCreados.push({ nombre: '[DEMO] Liga Masculina Norte F11', estado: 'finished' });
  console.log('  finalizado: [DEMO] Liga Masculina Norte F11 — 6/6 partidos, con campeón');

  /** 3. Inscripciones abiertas con cupo libre. */
  const abierto = await crearTorneo(
    {
      organizacionId: ligaCentral.id,
      nombre: '[DEMO] Copa Femenina Primavera F7',
      descripcion: 'Inscripciones abiertas: quedan lugares para sumarse.',
      modalidad: 'f7',
      categoriaGenero: 'female',
      ciudadId: caba,
      direccion: 'Polideportivo Chacarita',
      formato: 'league',
      cupoEquipos: 8,
      costoInscripcion: 50000,
      costoPlanilla: 7000,
      fechaInicioEstimada: EN_DIAS(25),
      fechaFinEstimada: EN_DIAS(80),
    },
    organizador.contexto,
  );
  await definirFormato({ torneoId: abierto.id, formato: 'league' }, organizador.contexto);
  await ponerImagenTorneo(abierto.id, 'copa-femenina');
  await publicarTorneo({ torneoId: abierto.id }, organizador.contexto);
  for (const equipo of [defemi, lasPibas, racingFem]) {
    await inscribirEquipo(abierto.id, equipo, organizador.contexto);
  }
  // Una queda pendiente de resolver: es la bandeja de trabajo del organizador.
  await solicitarInscripcion(
    { torneoId: abierto.id, equipoId: estrellaFem.id },
    estrellaFem.capitan.contexto,
  );
  torneosCreados.push({
    nombre: '[DEMO] Copa Femenina Primavera F7',
    estado: 'registration_open (3 aprobadas + 1 pendiente, cupo 8)',
  });
  console.log('  abierto: [DEMO] Copa Femenina Primavera F7 — 3 aprobadas, 1 pendiente, cupo 8');

  /** 4. Por empezar: fixture confirmado, sin resultados. */
  const porEmpezar = await crearTorneo(
    {
      organizacionId: ligaLitoral.id,
      nombre: '[DEMO] Copa Costanera F9',
      descripcion: 'Fixture ya armado, arranca la próxima fecha.',
      modalidad: 'f9',
      categoriaGenero: 'mixed',
      ciudadId: rosario,
      direccion: 'Parque Alem, Rosario',
      formato: 'league',
      cupoEquipos: 4,
      costoInscripcion: 38000,
      fechaInicioEstimada: EN_DIAS(7),
      fechaFinEstimada: EN_DIAS(60),
    },
    organizador.contexto,
  );
  await definirFormato({ torneoId: porEmpezar.id, formato: 'league' }, organizador.contexto);
  await ponerImagenTorneo(porEmpezar.id, 'copa-costanera');
  await publicarTorneo({ torneoId: porEmpezar.id }, organizador.contexto);
  for (const equipo of equiposRosario) {
    await inscribirEquipo(porEmpezar.id, equipo, organizador.contexto);
    await confirmarPlantelDemo(porEmpezar.id, equipo);
  }
  await ponerEnCurso(porEmpezar.id, organizador.contexto);
  torneosCreados.push({
    nombre: '[DEMO] Copa Costanera F9',
    estado: 'in_progress (sin resultados todavía)',
  });
  console.log('  por empezar: [DEMO] Copa Costanera F9 — fixture confirmado, 0 resultados');

  /** 5 y 6. Certamen con dos divisiones (D-103 a D-107). */
  const divisionA = await crearTorneo(
    {
      organizacionId: ligaLitoral.id,
      nombre: '[DEMO] Copa Misiones',
      descripcion: 'Certamen con dos divisiones: A y B.',
      modalidad: 'f5',
      categoriaGenero: 'mixed',
      ciudadId: posadas,
      direccion: 'Costanera de Posadas',
      formato: 'league',
      cupoEquipos: 4,
      costoInscripcion: 30000,
      fechaInicioEstimada: EN_DIAS(15),
      fechaFinEstimada: EN_DIAS(70),
    },
    organizador.contexto,
  );
  await definirFormato({ torneoId: divisionA.id, formato: 'league' }, organizador.contexto);
  await ponerImagenTorneo(divisionA.id, 'copa-misiones-a');
  await publicarTorneo({ torneoId: divisionA.id }, organizador.contexto);

  const divisionB = await agregarDivision(
    {
      torneoIdOrigen: divisionA.id,
      division: 'B',
      nombreCertamen: '[DEMO] Copa Misiones',
      divisionOrigen: 'A',
    },
    organizador.contexto,
  );
  await definirFormato({ torneoId: divisionB.id, formato: 'league' }, organizador.contexto);
  await ponerImagenTorneo(divisionB.id, 'copa-misiones-b');
  await publicarTorneo({ torneoId: divisionB.id }, organizador.contexto);

  await inscribirEquipo(divisionA.id, equiposPosadas[0]!, organizador.contexto);
  await inscribirEquipo(divisionA.id, equiposPosadas[1]!, organizador.contexto);
  await inscribirEquipo(divisionB.id, equiposPosadas[2]!, organizador.contexto);
  // El mismo equipo en dos divisiones del mismo certamen: dispara el aviso de D-109.
  await inscribirEquipo(divisionB.id, equiposPosadas[0]!, organizador.contexto);
  torneosCreados.push({
    nombre: '[DEMO] Copa Misiones (división A y B)',
    estado: 'registration_open, certamen con 2 divisiones',
  });
  console.log('  certamen: [DEMO] Copa Misiones — divisiones A y B, con aviso de doble división');

  /** 7. Borrador incompleto: el torneo que "necesita atención". */
  const borrador = await crearTorneo(
    {
      organizacionId: ligaCentral.id,
      nombre: '[DEMO] Copa Borrador F7',
      modalidad: 'f7',
      categoriaGenero: 'mixed',
      ciudadId: caba,
      formato: 'league',
      cupoEquipos: 6,
      // A propósito sin fecha de inicio ni dirección: `publicarTorneo` lo
      // rechaza con DATOS_MINIMOS_INCOMPLETOS, que es el estado a probar.
    },
    organizador.contexto,
  );
  torneosCreados.push({
    nombre: '[DEMO] Copa Borrador F7',
    estado: 'draft (datos mínimos incompletos)',
  });
  console.log('  borrador: [DEMO] Copa Borrador F7 — sin fecha ni dirección, no publicable');

  // ------------------------------------------- seguimientos sobre lo ya creado
  for (const torneoId of [enCurso.id, abierto.id, finalizado.id]) {
    await seguir({ tipoSeguido: 'tournament', entidadId: torneoId }, seguidor.contexto);
  }
  await seguir({ tipoSeguido: 'tournament', entidadId: abierto.id }, solicitante.contexto);

  console.log(`\nListo. Torneos creados: ${torneosCreados.length}`);
  console.log(`Borrador de equipo sin plantel: ${sinPlantel.nombre}`);
  console.log(`Cuenta sin confirmar (para probar el bloqueo): ${sinConfirmar.email}`);
  if (hayCredencialesDeAuth()) {
    console.log(`\nTodas las cuentas demo entran con la contraseña: ${PASSWORD_DEMO}`);
    console.log('  organizador → demo.organizador@demo.invicta.com.ar');
    console.log('  capitana    → demo.capitana@demo.invicta.com.ar');
    console.log('  capitán     → demo.capitan@demo.invicta.com.ar');
    console.log('  jugador     → demo.jugador@demo.invicta.com.ar');
    console.log('  delegada    → demo.delegada@demo.invicta.com.ar');
    console.log('  seguidor    → demo.seguidor@demo.invicta.com.ar');
    console.log('  sin confirmar → demo.sinconfirmar@demo.invicta.com.ar');
  }
}

// `--ejecutar` lo pone el script de npm. Sin ese flag el módulo solo
// exporta (así la ruta de API puede importarlo sin dispararlo al cargar).
if (process.argv.includes('--ejecutar')) {
  sembrarDemo()
    .then(() => obtenerPool().end())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
