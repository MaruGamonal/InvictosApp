import { describe, expect, it } from 'vitest';
import { CORREO_DE_PRODUCTO_ACTIVO, TIPOS_NOTIFICACION, canalesDe, esAccionable } from './tipos';

describe('la regla de canal (D-53)', () => {
  /**
   * Este test existe para que el correo de producto no se prenda por
   * accidente. Si alguien pone `CORREO_DE_PRODUCTO_ACTIVO = true`, esto
   * falla y obliga a actualizarlo a mano — que es exactamente la
   * conversación que hay que tener antes de empezar a escribirle a la
   * casilla de la gente.
   */
  it('el correo de producto está apagado', () => {
    expect(CORREO_DE_PRODUCTO_ACTIVO).toBe(false);
  });

  it('ningún tipo de aviso sale por correo', () => {
    for (const tipo of TIPOS_NOTIFICACION) {
      expect(canalesDe(tipo), `${tipo} no debería salir por correo`).toEqual(['in_app']);
    }
  });

  /**
   * `esAccionable` tiene un segundo trabajo además del canal: decide
   * qué aparece en el centro de notificaciones
   * (`listarNotificaciones`). Apagar el correo no puede haberlo
   * cambiado.
   */
  it('accionables e informativas siguen distinguiéndose', () => {
    expect(esAccionable('team_invitation')).toBe(true);
    expect(esAccionable('result_pending_confirmation')).toBe(true);
    expect(esAccionable('tournament_published')).toBe(false);
    expect(esAccionable('result_published')).toBe(false);
  });
});
