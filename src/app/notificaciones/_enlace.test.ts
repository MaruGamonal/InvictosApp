import { describe, expect, it } from 'vitest';
import { construirEnlaceNotificacion } from './_enlace';

describe('construirEnlaceNotificacion', () => {
  it('una invitación a un equipo manda a responderla', () => {
    expect(construirEnlaceNotificacion('team_invitation', 'equipo', 'eq-1')).toBe(
      '/equipo/eq-1/invitacion',
    );
  });

  it('un pedido de sumarse manda a gestionar el equipo', () => {
    expect(construirEnlaceNotificacion('team_join_requested', 'equipo', 'eq-1')).toBe(
      '/equipo/eq-1/gestionar',
    );
  });

  it('el resto de las de equipo manda a la ficha pública', () => {
    expect(construirEnlaceNotificacion('team_join_resolved', 'equipo', 'eq-1')).toBe(
      '/equipo/eq-1',
    );
  });

  it('una inscripción nueva manda a gestionar el torneo', () => {
    expect(construirEnlaceNotificacion('registration_received', 'torneo', 't-1')).toBe(
      '/torneo/t-1/gestionar',
    );
  });

  it('el resto de las de torneo manda a la ficha pública', () => {
    expect(construirEnlaceNotificacion('tournament_cancelled', 'torneo', 't-1')).toBe(
      '/torneo/t-1',
    );
  });

  it('sin origen de partido todavía no hay pantalla propia: sin enlace', () => {
    expect(construirEnlaceNotificacion('match_scheduled', 'partido', 'p-1')).toBeNull();
  });

  it('sin entidadOrigenId, sin enlace', () => {
    expect(construirEnlaceNotificacion('team_invitation', 'equipo', null)).toBeNull();
  });

  /**
   * Reportado en vivo: quien gestionaba una organización tocaba un
   * aviso de su propio torneo y aparecía en la ficha pública, en modo
   * jugador, sin haberlo pedido.
   */
  it('en modo organizador, un torneo lleva a su panel de gestión', () => {
    expect(
      construirEnlaceNotificacion('tournament_cancelled', 'torneo', 't-1', 'organizador'),
    ).toBe('/torneo/t-1/gestionar');
    expect(
      construirEnlaceNotificacion('registration_received', 'torneo', 't-1', 'organizador'),
    ).toBe('/torneo/t-1/gestionar');
  });

  it('en modo jugador sigue yendo a la ficha pública del torneo', () => {
    expect(construirEnlaceNotificacion('tournament_cancelled', 'torneo', 't-1', 'jugador')).toBe(
      '/torneo/t-1',
    );
  });

  /** Un equipo no es de la organización: no hay vista de organizador que mostrar. */
  it('un equipo va a su ficha en los dos modos', () => {
    expect(construirEnlaceNotificacion('team_join_resolved', 'equipo', 'eq-1', 'organizador')).toBe(
      '/equipo/eq-1',
    );
  });
});
