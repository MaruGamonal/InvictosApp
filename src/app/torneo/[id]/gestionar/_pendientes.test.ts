import { describe, expect, it } from 'vitest';
import type {
  GestionTorneoResultado,
  InscripcionGestion,
  PartidoGestion,
} from '@/services/torneos/obtenerGestionTorneo';
import { calcularLoQueEspera } from './_pendientes';

const AHORA = new Date('2026-06-15T12:00:00Z').getTime();
const AYER = '2026-06-14T20:00:00.000Z';
const MANANA = '2026-06-16T20:00:00.000Z';

function inscripcion(estado: string, equipoId = `e-${estado}`): InscripcionGestion {
  return {
    equipoId,
    nombreEquipo: 'Equipo',
    estado,
    advertenciaCategoria: false,
    advertenciaMultiplesDivisiones: false,
    fechaSolicitud: AYER,
    tieneTabla: false,
    ajustePuntos: 0,
    ultimoAjusteMotivo: null,
    motivoEstado: null,
  };
}

function partido(parcial: Partial<PartidoGestion> = {}): PartidoGestion {
  return {
    id: `p-${Math.random()}`,
    faseId: 'f-1',
    numeroFecha: 1,
    equipoLocalId: 'e-1',
    equipoLocalNombre: 'Local',
    equipoVisitanteId: 'e-2',
    equipoVisitanteNombre: 'Visitante',
    golesLocal: null,
    golesVisitante: null,
    estado: 'scheduled',
    version: 1,
    fechaHoraProgramada: MANANA,
    sedeNombre: null,
    estadoResultado: 'pending',
    objecionMotivo: null,
    ...parcial,
  };
}

function gestion(parcial: Partial<GestionTorneoResultado> = {}): GestionTorneoResultado {
  return {
    id: 't-1',
    organizacionId: 'o-1',
    miRolEnOrganizacion: 'owner',
    nombre: 'Torneo',
    descripcion: null,
    imagenUrl: null,
    direccion: null,
    ciudadId: 'c-1',
    costoInscripcion: null,
    costoPlanilla: null,
    cupoEquipos: 8,
    fechaInicioEstimada: null,
    fechaFinEstimada: null,
    estado: 'in_progress',
    formato: 'league',
    certamenId: null,
    division: null,
    divisionesDelCertamen: [],
    reglas: {
      minJugadoresLista: 5,
      maxJugadoresLista: 20,
      puntosVictoria: 3,
      puntosEmpate: 1,
      puntosDerrota: 0,
      jugadorUnicoPorEquipo: true,
      soloOrganizadorCargaResultados: false,
      partidosPendientesPorAbandono: 'ganados_por_rival',
      golesWalkoverGanador: 3,
      golesWalkoverPerdedor: 0,
      fechaCierreListaBuenaFe: null,
    },
    fases: [],
    inscripciones: [],
    partidos: [],
    elegiblesPorEquipo: {},
    ...parcial,
  };
}

describe('lo que espera al organizador', () => {
  it('sin nada trabado no inventa pendientes', () => {
    const resultado = calcularLoQueEspera(gestion(), AHORA);
    expect(resultado.pendientes).toEqual([]);
  });

  /**
   * El orden no es el de la pantalla, es el de urgencia: primero lo que
   * tiene a alguien esperando del otro lado o deja la tabla mal.
   */
  it('ordena por urgencia: objetado, solicitudes, sin cargar, sin programar', () => {
    const resultado = calcularLoQueEspera(
      gestion({
        inscripciones: [inscripcion('pending'), inscripcion('waitlisted', 'e-2')],
        partidos: [
          partido({ estadoResultado: 'disputed', estado: 'played' }),
          partido({ fechaHoraProgramada: AYER }),
          partido({ fechaHoraProgramada: null, estado: 'unscheduled' }),
        ],
      }),
      AHORA,
    );

    expect(resultado.pendientes.map((p) => p.texto)).toEqual([
      '1 resultado objetado',
      '2 equipos esperando respuesta',
      '1 partido jugado sin resultado',
      '1 partido sin programar',
    ]);
    expect(resultado.pendientes.map((p) => p.href)).toEqual([
      '/torneo/t-1/gestionar/resultados',
      '/torneo/t-1/gestionar/equipos',
      '/torneo/t-1/gestionar/resultados',
      '/torneo/t-1/gestionar/fixture',
    ]);
  });

  it('un partido programado para mañana todavía no es un resultado que falte', () => {
    const resultado = calcularLoQueEspera(
      gestion({ partidos: [partido({ fechaHoraProgramada: MANANA })] }),
      AHORA,
    );
    expect(resultado.pendientes).toEqual([]);
  });

  /** Un ganado por presentación o un anulado ya están resueltos: no esperan a nadie. */
  it.each(['walkover', 'cancelled', 'played'])(
    'un partido %s con fecha pasada no cuenta como resultado faltante',
    (estado) => {
      const resultado = calcularLoQueEspera(
        gestion({ partidos: [partido({ estado, fechaHoraProgramada: AYER })] }),
        AHORA,
      );
      expect(resultado.pendientes).toEqual([]);
    },
  );

  it('una inscripción resuelta no espera a nadie', () => {
    const resultado = calcularLoQueEspera(
      gestion({
        inscripciones: [inscripcion('approved'), inscripcion('rejected'), inscripcion('withdrawn')],
      }),
      AHORA,
    );
    expect(resultado.pendientes).toEqual([]);
  });
});

describe('el paso siguiente según el estado', () => {
  /**
   * Con cupo libre el torneo está esperando equipos, no al organizador.
   * Ofrecerle "cerrar inscripciones" sería empujarlo a cerrar un torneo
   * a medio llenar.
   */
  it('con las inscripciones abiertas y cupo libre, no propone nada', () => {
    const resultado = calcularLoQueEspera(
      gestion({
        estado: 'registration_open',
        cupoEquipos: 8,
        inscripciones: [inscripcion('approved')],
      }),
      AHORA,
    );
    expect(resultado.siguiente).toBeNull();
  });

  it('con el cupo completo, propone cerrar las inscripciones', () => {
    const resultado = calcularLoQueEspera(
      gestion({
        estado: 'registration_open',
        cupoEquipos: 2,
        inscripciones: [inscripcion('approved', 'a'), inscripcion('approved', 'b')],
      }),
      AHORA,
    );
    expect(resultado.siguiente).toEqual({
      texto: 'Cerrar las inscripciones',
      href: '/torneo/t-1/gestionar/configuracion/estado',
    });
  });

  it('cerradas y sin fixture, propone generarlo', () => {
    const resultado = calcularLoQueEspera(gestion({ estado: 'registration_closed' }), AHORA);
    expect(resultado.siguiente).toEqual({
      texto: 'Generar el fixture',
      href: '/torneo/t-1/gestionar/fixture',
    });
  });

  it('cerradas y con fixture, propone iniciar el torneo', () => {
    const resultado = calcularLoQueEspera(
      gestion({ estado: 'registration_closed', partidos: [partido()] }),
      AHORA,
    );
    expect(resultado.siguiente?.texto).toBe('Iniciar el torneo');
  });

  it('en curso con partidos por jugar, no propone finalizar', () => {
    const resultado = calcularLoQueEspera(
      gestion({ estado: 'in_progress', partidos: [partido()] }),
      AHORA,
    );
    expect(resultado.siguiente).toBeNull();
  });

  it('en curso con todo resuelto, propone finalizar', () => {
    const resultado = calcularLoQueEspera(
      gestion({ estado: 'in_progress', partidos: [partido({ estado: 'played' })] }),
      AHORA,
    );
    expect(resultado.siguiente?.texto).toBe('Finalizar el torneo');
  });

  it('suspendido, propone retomarlo', () => {
    const resultado = calcularLoQueEspera(gestion({ estado: 'suspended' }), AHORA);
    expect(resultado.siguiente?.texto).toBe('Retomar el torneo');
  });

  it.each(['finished', 'cancelled'])('%s ya no se mueve: no propone nada', (estado) => {
    expect(calcularLoQueEspera(gestion({ estado }), AHORA).siguiente).toBeNull();
  });
});
