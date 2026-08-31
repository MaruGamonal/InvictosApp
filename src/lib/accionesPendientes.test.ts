import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ejecutarAccionPendiente,
  registrarAccionPendiente,
  reiniciarAccionesPendientes,
} from './accionesPendientes';

beforeEach(() => {
  reiniciarAccionesPendientes();
});

describe('registrarAccionPendiente / ejecutarAccionPendiente', () => {
  it('ejecuta el ejecutor registrado para ese tipo, con los datos y el usuario nuevo', async () => {
    const ejecutor = vi.fn().mockResolvedValue(undefined);
    registrarAccionPendiente('seguir_torneo', ejecutor);

    await ejecutarAccionPendiente({ tipo: 'seguir_torneo', datos: { torneoId: 't-1' } }, 'u-1');

    expect(ejecutor).toHaveBeenCalledWith({ torneoId: 't-1' }, 'u-1');
  });

  it('un tipo sin ejecutor registrado falla explícitamente, en vez de ignorar la acción en silencio', async () => {
    await expect(
      ejecutarAccionPendiente({ tipo: 'algo_que_no_existe_todavia', datos: {} }, 'u-1'),
    ).rejects.toThrow(/algo_que_no_existe_todavia/);
  });
});
