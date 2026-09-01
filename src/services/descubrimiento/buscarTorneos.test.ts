import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const VISITANTE: Contexto = { usuarioId: null, permisos: {}, esSistema: false };

const CIUDAD = '11111111-1111-1111-1111-111111111111';

beforeEach(() => vi.resetModules());

function filaTorneo(id: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    nombre: `Torneo ${id}`,
    organizacion_logo_url: null,
    modalidad: 'f5',
    categoria_edad: 'open',
    estado: 'registration_open',
    fecha_inicio_estimada: null,
    organizacion_verificada: false,
    ...over,
  };
}

function mockearDb(opciones: {
  torneos?: ReturnType<typeof filaTorneo>[];
  provincia?: { nombre: string; cantidad: string } | null;
}) {
  const consultas: { texto: string; valores: unknown[] }[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        const t = texto.trim();
        consultas.push({ texto: t, valores });
        if (t.startsWith('SELECT t.id, t.nombre')) {
          return { rows: opciones.torneos ?? [] };
        }
        if (t.startsWith('SELECT p.nombre, count(t.id)')) {
          return { rows: opciones.provincia ? [opciones.provincia] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
  return consultas;
}

describe('buscarTorneos', () => {
  it('solo pide torneos public de la ciudad indicada', async () => {
    const consultas = mockearDb({ torneos: [filaTorneo('t1')] });
    const { buscarTorneos } = await import('./buscarTorneos');

    await buscarTorneos({ ciudadId: CIUDAD }, VISITANTE);

    const busqueda = consultas.find((c) => c.texto.startsWith('SELECT t.id, t.nombre'));
    expect(busqueda!.texto).toContain('t.visibilidad = $1');
    expect(busqueda!.texto).toContain('t.ciudad_id = $2');
    expect(busqueda!.valores[0]).toBe('public');
    expect(busqueda!.valores[1]).toBe(CIUDAD);
  });

  // paginar() (T5) no reordena: asume que las filas ya llegan ordenadas por el
  // ORDER BY de la consulta — igual que el resto de los servicios paginados de
  // este proyecto (p. ej. listarNotificaciones). Estas pruebas fijan el
  // contrato en dos frentes: la fila mockeada ya viene en el orden que Postgres
  // daría, y el propio ORDER BY queda pineado en el texto de la consulta —
  // el orden real con datos reales se confirma aparte con Postgres.
  it('el ORDER BY prioriza inscripciones abiertas, después fecha, después verificación', async () => {
    const consultas = mockearDb({ torneos: [] });
    const { buscarTorneos } = await import('./buscarTorneos');

    await buscarTorneos({ ciudadId: CIUDAD }, VISITANTE);

    const busqueda = consultas.find((c) => c.texto.startsWith('SELECT t.id, t.nombre'));
    const ordenBy = busqueda!.texto.slice(busqueda!.texto.indexOf('ORDER BY'));
    expect(ordenBy.indexOf("t.estado = 'registration_open'")).toBeLessThan(
      ordenBy.indexOf('t.fecha_inicio_estimada'),
    );
    expect(ordenBy.indexOf('t.fecha_inicio_estimada')).toBeLessThan(
      ordenBy.indexOf('organizacion_verificada'),
    );
  });

  it('inscripciones abiertas van antes que el resto (filas ya en orden de Postgres)', async () => {
    mockearDb({
      torneos: [
        filaTorneo('abierto', { estado: 'registration_open' }),
        filaTorneo('cerrado', { estado: 'in_progress' }),
      ],
    });
    const { buscarTorneos } = await import('./buscarTorneos');

    const resultado = await buscarTorneos({ ciudadId: CIUDAD }, VISITANTE);

    expect(resultado.torneos.map((t) => t.id)).toEqual(['abierto', 'cerrado']);
  });

  it('a igual fecha, la organización verificada va primero (filas ya en orden de Postgres)', async () => {
    mockearDb({
      torneos: [
        filaTorneo('verificado', {
          fecha_inicio_estimada: new Date('2026-06-01T00:00:00Z'),
          organizacion_verificada: true,
        }),
        filaTorneo('sin-verificar', {
          fecha_inicio_estimada: new Date('2026-06-01T00:00:00Z'),
          organizacion_verificada: false,
        }),
      ],
    });
    const { buscarTorneos } = await import('./buscarTorneos');

    const resultado = await buscarTorneos({ ciudadId: CIUDAD }, VISITANTE);

    expect(resultado.torneos.map((t) => t.id)).toEqual(['verificado', 'sin-verificar']);
  });

  it('ordena por fecha de inicio más cercana primero (filas ya en orden de Postgres)', async () => {
    mockearDb({
      torneos: [
        filaTorneo('cercano', { fecha_inicio_estimada: new Date('2026-06-01T00:00:00Z') }),
        filaTorneo('lejano', { fecha_inicio_estimada: new Date('2026-12-01T00:00:00Z') }),
      ],
    });
    const { buscarTorneos } = await import('./buscarTorneos');

    const resultado = await buscarTorneos({ ciudadId: CIUDAD }, VISITANTE);

    expect(resultado.torneos.map((t) => t.id)).toEqual(['cercano', 'lejano']);
  });

  it('filtra por modalidad cuando se indica', async () => {
    const consultas = mockearDb({ torneos: [] });
    const { buscarTorneos } = await import('./buscarTorneos');

    await buscarTorneos({ ciudadId: CIUDAD, modalidad: 'f7' }, VISITANTE);

    const busqueda = consultas.find((c) => c.texto.startsWith('SELECT t.id, t.nombre'));
    expect(busqueda!.texto).toContain('t.modalidad = $4');
    expect(busqueda!.valores).toContain('f7');
  });

  it('una ciudad sin torneos trae la sugerencia de provincia con su cantidad', async () => {
    mockearDb({ torneos: [], provincia: { nombre: 'Buenos Aires', cantidad: '7' } });
    const { buscarTorneos } = await import('./buscarTorneos');

    const resultado = await buscarTorneos({ ciudadId: CIUDAD }, VISITANTE);

    expect(resultado.torneos).toEqual([]);
    expect(resultado.sugerenciaProvincia).toEqual({ nombre: 'Buenos Aires', cantidadTorneos: 7 });
  });

  it('una página siguiente vacía (fin del listado) no dispara la sugerencia de provincia', async () => {
    const consultas = mockearDb({ torneos: [] });
    const { buscarTorneos } = await import('./buscarTorneos');

    const resultado = await buscarTorneos(
      {
        ciudadId: CIUDAD,
        cursor: Buffer.from(JSON.stringify([0, 1, 0, 'x'])).toString('base64url'),
      },
      VISITANTE,
    );

    expect(resultado.sugerenciaProvincia).toBeNull();
    expect(consultas.some((c) => c.texto.startsWith('SELECT p.nombre, count(t.id)'))).toBe(false);
  });

  it('pagina por cursor: la segunda página empieza después de la última clave vista', async () => {
    mockearDb({
      torneos: [filaTorneo('a'), filaTorneo('b'), filaTorneo('c')],
    });
    const { buscarTorneos } = await import('./buscarTorneos');

    const primera = await buscarTorneos({ ciudadId: CIUDAD, tamanoPagina: 2 }, VISITANTE);
    expect(primera.torneos.map((t) => t.id)).toEqual(['a', 'b']);
    expect(primera.cursorSiguiente).not.toBeNull();

    vi.resetModules();
    mockearDb({ torneos: [filaTorneo('a'), filaTorneo('b'), filaTorneo('c')] });
    const { buscarTorneos: buscarTorneos2 } = await import('./buscarTorneos');
    const segunda = await buscarTorneos2(
      { ciudadId: CIUDAD, tamanoPagina: 2, cursor: primera.cursorSiguiente! },
      VISITANTE,
    );
    expect(segunda.torneos.map((t) => t.id)).toEqual(['c']);
  });
});
