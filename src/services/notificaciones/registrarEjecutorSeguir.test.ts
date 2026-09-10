import { beforeEach, describe, expect, it, vi } from 'vitest';

type Ejecutor = (datos: Record<string, unknown>, usuarioId: string) => Promise<void>;

beforeEach(() => vi.resetModules());

describe('registrarEjecutorSeguir', () => {
  it('registra el ejecutor de "seguir" y llama a seguir() con la sesión de quien se acaba de registrar', async () => {
    let ejecutorCapturado: Ejecutor | null = null;
    const registrarAccionPendiente = vi.fn((tipo: string, ejecutor: Ejecutor) => {
      if (tipo === 'seguir') ejecutorCapturado = ejecutor;
    });
    vi.doMock('@/lib/accionesPendientes', () => ({ registrarAccionPendiente }));
    const seguir = vi.fn().mockResolvedValue({ siguiendo: true });
    vi.doMock('./seguir', () => ({ seguir }));

    await import('./registrarEjecutorSeguir');

    expect(registrarAccionPendiente).toHaveBeenCalledWith('seguir', expect.any(Function));
    expect(ejecutorCapturado).not.toBeNull();

    await ejecutorCapturado!({ tipoSeguido: 'tournament', entidadId: 't-1' }, 'usuario-1');
    expect(seguir).toHaveBeenCalledWith(
      { tipoSeguido: 'tournament', entidadId: 't-1' },
      { usuarioId: 'usuario-1', permisos: {}, esSistema: false },
    );

    vi.doUnmock('@/lib/accionesPendientes');
    vi.doUnmock('./seguir');
  });

  it('con tipoSeguido inválido, no llama a seguir() — nunca rompe un registro ya creado', async () => {
    let ejecutorCapturado: Ejecutor | null = null;
    vi.doMock('@/lib/accionesPendientes', () => ({
      registrarAccionPendiente: vi.fn((_tipo: string, ejecutor: Ejecutor) => {
        ejecutorCapturado = ejecutor;
      }),
    }));
    const seguir = vi.fn();
    vi.doMock('./seguir', () => ({ seguir }));

    await import('./registrarEjecutorSeguir');
    await ejecutorCapturado!({ tipoSeguido: 'algo-raro', entidadId: 't-1' }, 'usuario-1');
    expect(seguir).not.toHaveBeenCalled();

    vi.doUnmock('@/lib/accionesPendientes');
    vi.doUnmock('./seguir');
  });

  it('sin entidadId, no llama a seguir()', async () => {
    let ejecutorCapturado: Ejecutor | null = null;
    vi.doMock('@/lib/accionesPendientes', () => ({
      registrarAccionPendiente: vi.fn((_tipo: string, ejecutor: Ejecutor) => {
        ejecutorCapturado = ejecutor;
      }),
    }));
    const seguir = vi.fn();
    vi.doMock('./seguir', () => ({ seguir }));

    await import('./registrarEjecutorSeguir');
    await ejecutorCapturado!({ tipoSeguido: 'team' }, 'usuario-1');
    expect(seguir).not.toHaveBeenCalled();

    vi.doUnmock('@/lib/accionesPendientes');
    vi.doUnmock('./seguir');
  });
});
