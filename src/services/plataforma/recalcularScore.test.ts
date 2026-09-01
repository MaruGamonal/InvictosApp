import { describe, expect, it } from 'vitest';
import { recalcularScore } from './recalcularScore';

describe('recalcularScore', () => {
  it('T26 solo la declara y la agenda: no computa nada todavía (`07`, sección 5)', async () => {
    const resumen = await recalcularScore();
    expect(resumen).toEqual({ procesados: 0, cambiados: 0, fallidos: [] });
  });
});
