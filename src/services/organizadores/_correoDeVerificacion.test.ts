import { describe, expect, it } from 'vitest';
import { construirCorreoDeVerificacion } from './_correoDeVerificacion';

const ENLACE =
  'https://www.ejemplo.test/acceso/confirmar/organizacion/abc?token_hash=t&type=magiclink';

describe('construirCorreoDeVerificacion', () => {
  /**
   * La razón de existir del correo propio: Supabase comparte la
   * plantilla de Magic Link entre confirmar la cuenta y verificar una
   * organización, así que no podía nombrarla. Quien tiene dos clubes a
   * cargo recibía dos correos idénticos.
   */
  it('nombra la organización en el asunto y en el cuerpo', () => {
    const correo = construirCorreoDeVerificacion({
      nombreOrganizacion: 'Club Atlético Posadas',
      enlace: ENLACE,
    });

    expect(correo.asunto).toBe('Verificá Club Atlético Posadas');
    expect(correo.html).toContain('Verificá Club Atlético Posadas');
    expect(correo.texto).toContain('Verificá Club Atlético Posadas');
  });

  it('el botón y el texto plano llevan el enlace con su token', () => {
    const correo = construirCorreoDeVerificacion({
      nombreOrganizacion: 'Liga del Sur',
      enlace: ENLACE,
    });

    expect(correo.html).toContain(`href="${ENLACE}"`);
    expect(correo.texto).toContain(ENLACE);
  });

  /** El nombre lo escribe gente: nunca va crudo al HTML. */
  it('escapa el nombre de la organización', () => {
    const correo = construirCorreoDeVerificacion({
      nombreOrganizacion: '<script>alert(1)</script>',
      enlace: ENLACE,
    });

    expect(correo.html).not.toContain('<script>');
    expect(correo.html).toContain('&lt;script&gt;');
    // El asunto no es HTML: va tal cual, y el proveedor lo trata como texto.
    expect(correo.asunto).toBe('Verificá <script>alert(1)</script>');
  });

  it('avisa que el enlace sirve una sola vez', () => {
    const correo = construirCorreoDeVerificacion({
      nombreOrganizacion: 'Liga del Sur',
      enlace: ENLACE,
    });

    expect(correo.html).toContain('una sola vez');
    expect(correo.texto).toContain('una sola vez');
  });
});
