import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from '@/lib/contexto';

const contextoCon = (usuarioId: string | null): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema: false,
});

const TORNEO = '11111111-1111-1111-1111-111111111111';

beforeEach(() => vi.resetModules());

function mockearDb(opciones: {
  organizacionId?: string;
  rolOrganizacion?: 'owner' | 'admin';
  fila?: Record<string, unknown> | null;
}) {
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
        if (texto.includes('FROM torneo t')) {
          const fila =
            opciones.fila === undefined
              ? {
                  estado: 'draft',
                  ciudad_nombre: 'San Isidro',
                  organizacion_id: 'org-1',
                  nivel_verificacion: 'basic',
                  usuario_titular_id: 'usuario-1',
                  publicados: '0',
                }
              : opciones.fila;
          return { rows: fila ? [fila] : [] };
        }
        return { rows: [] };
      },
    }),
  }));
}

describe('obtenerResumenParaPublicar', () => {
  it('sin ser titular ni administrador de la organización, SIN_PERMISO', async () => {
    mockearDb({ organizacionId: 'org-1' });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    await expect(
      obtenerResumenParaPublicar({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('torneo inexistente, NO_ENCONTRADO', async () => {
    mockearDb({ organizacionId: 'org-1', rolOrganizacion: 'owner', fila: null });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    await expect(
      obtenerResumenParaPublicar({ torneoId: TORNEO }, contextoCon('usuario-1')),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('con organización verificada (basic o trusted), organizacionVerificada true', async () => {
    mockearDb({ organizacionId: 'org-1', rolOrganizacion: 'owner' });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    const resultado = await obtenerResumenParaPublicar(
      { torneoId: TORNEO },
      contextoCon('usuario-1'),
    );
    expect(resultado).toEqual({
      torneoEstado: 'draft',
      ciudadNombre: 'San Isidro',
      organizacionId: 'org-1',
      organizacionVerificada: true,
      soyTitular: true,
      limitePublicadosAlcanzado: false,
    });
  });

  it('con organización sin verificar, organizacionVerificada false', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'owner',
      fila: {
        estado: 'draft',
        ciudad_nombre: 'San Isidro',
        organizacion_id: 'org-1',
        nivel_verificacion: 'unverified',
        usuario_titular_id: 'usuario-1',
        publicados: '0',
      },
    });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    const resultado = await obtenerResumenParaPublicar(
      { torneoId: TORNEO },
      contextoCon('usuario-1'),
    );
    expect(resultado.organizacionVerificada).toBe(false);
  });

  /**
   * D-51 pide ofrecer la verificación en el mismo lugar donde se da la
   * noticia, y quien la pide es el Titular (`10`, 4.2). Sin este dato,
   * la pantalla le ofrecía el botón a un Administrador que iba a
   * recibir SIN_PERMISO al tocarlo.
   */
  it('un Administrador que no es el Titular no figura como titular', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'admin',
      fila: {
        estado: 'draft',
        ciudad_nombre: 'San Isidro',
        organizacion_id: 'org-1',
        nivel_verificacion: 'unverified',
        usuario_titular_id: 'otra-persona',
        publicados: '0',
      },
    });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    const resultado = await obtenerResumenParaPublicar(
      { torneoId: TORNEO },
      contextoCon('usuario-1'),
    );
    expect(resultado.soyTitular).toBe(false);
  });

  /**
   * Avisar del límite **antes** de tocar el botón. `publicarTorneo` lo
   * vuelve a comprobar: esto es lo que se muestra, no lo que decide.
   */
  it('sin verificar y con un torneo ya publicado, el límite figura alcanzado', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'owner',
      fila: {
        estado: 'draft',
        ciudad_nombre: 'San Isidro',
        organizacion_id: 'org-1',
        nivel_verificacion: 'unverified',
        usuario_titular_id: 'usuario-1',
        publicados: '1',
      },
    });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    const resultado = await obtenerResumenParaPublicar(
      { torneoId: TORNEO },
      contextoCon('usuario-1'),
    );
    expect(resultado.limitePublicadosAlcanzado).toBe(true);
  });

  /** Verificada, el límite no existe: puede tener los que quiera. */
  it('verificada con torneos publicados, el límite no aplica', async () => {
    mockearDb({
      organizacionId: 'org-1',
      rolOrganizacion: 'owner',
      fila: {
        estado: 'draft',
        ciudad_nombre: 'San Isidro',
        organizacion_id: 'org-1',
        nivel_verificacion: 'trusted',
        usuario_titular_id: 'usuario-1',
        publicados: '7',
      },
    });
    const { obtenerResumenParaPublicar } = await import('./obtenerResumenParaPublicar');
    const resultado = await obtenerResumenParaPublicar(
      { torneoId: TORNEO },
      contextoCon('usuario-1'),
    );
    expect(resultado.limitePublicadosAlcanzado).toBe(false);
  });
});
