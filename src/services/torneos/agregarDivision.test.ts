import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO_ORIGEN = '11111111-1111-1111-1111-111111111111';
const ORGANIZACION = '22222222-2222-2222-2222-222222222222';
const CERTAMEN = '33333333-3333-3333-3333-333333333333';
const TORNEO_NUEVO = '44444444-4444-4444-4444-444444444444';

function mockearDb(opciones: {
  rolOrganizacion?: 'owner' | 'admin';
  organizacionId?: string;
  certamenIdOrigen?: string | null;
  divisionExistente?: boolean;
  reglamento?: { texto: string | null; archivo_url: string | null } | null;
}) {
  const consultasCliente: string[] = [];
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string) => {
        if (texto.includes('SELECT organizacion_id FROM torneo WHERE id')) {
          return {
            rows: opciones.organizacionId ? [{ organizacion_id: opciones.organizacionId }] : [],
          };
        }
        if (texto.includes('SELECT rol FROM miembro_organizacion')) {
          return { rows: opciones.rolOrganizacion ? [{ rol: opciones.rolOrganizacion }] : [] };
        }
        if (texto.includes('SELECT organizacion_id, certamen_id FROM torneo')) {
          return opciones.organizacionId
            ? {
                rows: [
                  {
                    organizacion_id: opciones.organizacionId,
                    certamen_id: opciones.certamenIdOrigen ?? null,
                  },
                ],
              }
            : { rows: [] };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async (texto: string, valores: unknown[] = []) => {
          consultasCliente.push(texto.trim());
          if (texto.startsWith('INSERT INTO certamen')) {
            return { rows: [{ id: CERTAMEN }] };
          }
          if (texto.startsWith('SELECT 1 FROM torneo WHERE certamen_id')) {
            return { rows: opciones.divisionExistente ? [{ '?column?': 1 }] : [] };
          }
          if (texto.startsWith('INSERT INTO torneo')) {
            return { rows: [{ id: TORNEO_NUEVO }] };
          }
          if (texto.startsWith('SELECT texto, archivo_url FROM reglamento')) {
            return { rows: opciones.reglamento ? [opciones.reglamento] : [] };
          }
          return { rows: [], _valores: valores };
        },
        release: () => {},
      }),
    }),
  }));
  return consultasCliente;
}

beforeEach(() => vi.resetModules());

describe('agregarDivision', () => {
  it('primera división: crea el certamen, etiqueta al torneo de origen y copia el nuevo', async () => {
    const consultas = mockearDb({
      rolOrganizacion: 'owner',
      organizacionId: ORGANIZACION,
      certamenIdOrigen: null,
      reglamento: { texto: 'Reglamento vigente', archivo_url: null },
    });
    const { agregarDivision } = await import('./agregarDivision');

    const resultado = await agregarDivision(
      {
        torneoIdOrigen: TORNEO_ORIGEN,
        division: 'B',
        nombreCertamen: 'Apertura 2026',
        divisionOrigen: 'A',
      },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ id: TORNEO_NUEVO, certamenId: CERTAMEN, division: 'B' });
    expect(consultas.some((c) => c.startsWith('INSERT INTO certamen'))).toBe(true);
    expect(consultas.some((c) => c.startsWith('UPDATE torneo SET certamen_id'))).toBe(true);
    expect(consultas.some((c) => c.startsWith('INSERT INTO reglamento'))).toBe(true);
    expect(consultas.some((c) => c.startsWith('INSERT INTO colaborador_torneo'))).toBe(true);
    expect(consultas).toContain('COMMIT');
  });

  it('división adicional sobre un certamen ya existente, sin pedir nombreCertamen', async () => {
    const consultas = mockearDb({
      rolOrganizacion: 'owner',
      organizacionId: ORGANIZACION,
      certamenIdOrigen: CERTAMEN,
    });
    const { agregarDivision } = await import('./agregarDivision');

    const resultado = await agregarDivision(
      { torneoIdOrigen: TORNEO_ORIGEN, division: 'C' },
      contextoCon('usuario-1'),
    );

    expect(resultado).toEqual({ id: TORNEO_NUEVO, certamenId: CERTAMEN, division: 'C' });
    expect(consultas.some((c) => c.startsWith('INSERT INTO certamen'))).toBe(false);
  });

  it('etiqueta repetida en el mismo certamen, DIVISION_DUPLICADA', async () => {
    mockearDb({
      rolOrganizacion: 'owner',
      organizacionId: ORGANIZACION,
      certamenIdOrigen: CERTAMEN,
      divisionExistente: true,
    });
    const { agregarDivision } = await import('./agregarDivision');

    await expect(
      agregarDivision({ torneoIdOrigen: TORNEO_ORIGEN, division: 'B' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DIVISION_DUPLICADA' });
  });

  it('primera división sin nombreCertamen/divisionOrigen, DATOS_INVALIDOS', async () => {
    mockearDb({ rolOrganizacion: 'owner', organizacionId: ORGANIZACION, certamenIdOrigen: null });
    const { agregarDivision } = await import('./agregarDivision');

    await expect(
      agregarDivision({ torneoIdOrigen: TORNEO_ORIGEN, division: 'B' }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });

  it('torneo de origen inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ rolOrganizacion: 'owner', organizacionId: undefined });
    const { agregarDivision } = await import('./agregarDivision');

    await expect(
      agregarDivision(
        { torneoIdOrigen: TORNEO_ORIGEN, division: 'B', nombreCertamen: 'X', divisionOrigen: 'A' },
        contextoCon('usuario-1'),
      ),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearDb({});
    const { agregarDivision } = await import('./agregarDivision');

    await expect(
      agregarDivision({ torneoIdOrigen: TORNEO_ORIGEN, division: 'B' }, contextoCon(null)),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });
});
