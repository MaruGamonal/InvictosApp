import { describe, expect, it } from 'vitest';
import { construirCorreoDeNotificacion } from './_contenidoDelCorreo';

const SITIO = 'https://www.invicta.com.ar';

describe('construirCorreoDeNotificacion', () => {
  /**
   * El asunto no se escribe acá: sale de `etiquetas.ts`, el mismo
   * catálogo que ve la persona dentro de la aplicación. Si alguien
   * cambia el wording en un solo lado, este test lo dice.
   */
  it('el asunto es la etiqueta del catálogo, con el nombre de la entidad', () => {
    const correo = construirCorreoDeNotificacion(
      {
        tipo: 'team_invitation',
        entidadOrigenTipo: 'equipo',
        entidadOrigenId: 'eq-1',
        nombreEntidad: 'Deportivo Pichincha',
      },
      SITIO,
    );

    expect(correo.asunto).toBe('Te invitaron a un equipo — Deportivo Pichincha');
  });

  it('sin nombre de entidad, el asunto es sólo la etiqueta', () => {
    const correo = construirCorreoDeNotificacion(
      {
        tipo: 'match_rescheduled',
        entidadOrigenTipo: 'partido',
        entidadOrigenId: 'pa-1',
        nombreEntidad: null,
      },
      SITIO,
    );

    expect(correo.asunto).toBe('Cambió el horario de tu partido');
  });

  it('el botón lleva al mismo lugar que tocar la notificación, en absoluto', () => {
    const correo = construirCorreoDeNotificacion(
      {
        tipo: 'team_invitation',
        entidadOrigenTipo: 'equipo',
        entidadOrigenId: 'eq-1',
        nombreEntidad: 'Las Canteras',
      },
      SITIO,
    );

    expect(correo.html).toContain(`${SITIO}/equipo/eq-1/invitacion`);
    expect(correo.texto).toContain(`${SITIO}/equipo/eq-1/invitacion`);
  });

  /**
   * Las de origen `partido` no tienen pantalla propia. Antes que mandar
   * a un 404, el correo lleva al centro de notificaciones.
   */
  it('una notificación sin pantalla propia lleva al centro de notificaciones', () => {
    const correo = construirCorreoDeNotificacion(
      {
        tipo: 'result_pending_confirmation',
        entidadOrigenTipo: 'partido',
        entidadOrigenId: 'pa-9',
        nombreEntidad: null,
      },
      SITIO,
    );

    expect(correo.html).toContain(`${SITIO}/notificaciones`);
    expect(correo.html).not.toContain('/partido/');
  });

  /** El nombre de un equipo lo escribe una persona: nunca va crudo al HTML. */
  it('escapa el nombre de la entidad', () => {
    const correo = construirCorreoDeNotificacion(
      {
        tipo: 'team_invitation',
        entidadOrigenTipo: 'equipo',
        entidadOrigenId: 'eq-1',
        nombreEntidad: '<script>alert(1)</script>',
      },
      SITIO,
    );

    expect(correo.html).not.toContain('<script>');
    expect(correo.html).toContain('&lt;script&gt;');
  });

  it('siempre ofrece cambiar qué avisos se reciben', () => {
    const correo = construirCorreoDeNotificacion(
      {
        tipo: 'registration_received',
        entidadOrigenTipo: 'torneo',
        entidadOrigenId: 'to-1',
        nombreEntidad: 'Copa Costanera F9',
      },
      SITIO,
    );

    expect(correo.html).toContain(`${SITIO}/notificaciones/preferencias`);
    expect(correo.texto).toContain(`${SITIO}/notificaciones/preferencias`);
  });

  it('la barra final del sitio no duplica la del enlace', () => {
    const correo = construirCorreoDeNotificacion(
      {
        tipo: 'team_invitation',
        entidadOrigenTipo: 'equipo',
        entidadOrigenId: 'eq-1',
        nombreEntidad: null,
      },
      'https://www.invicta.com.ar',
    );

    expect(correo.html).not.toContain('.ar//');
  });
});
