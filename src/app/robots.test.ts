import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';

afterEach(() => vi.unstubAllEnvs());

describe('robots.txt', () => {
  it('en producción deja indexar lo público y no la API, y anuncia el sitemap', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'produccion');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.invicta.com.ar');
    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: '/api/' },
      sitemap: 'https://www.invicta.com.ar/sitemap.xml',
    });
  });

  /**
   * El ambiente de pruebas tiene dominio propio y es público, así que
   * un buscador llega igual que cualquiera — y lo que encontraría son
   * torneos inventados en una copia del sitio real.
   */
  it('en pruebas no deja indexar nada', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'pruebas');
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  /**
   * Anunciar el sitemap desde pruebas sería señalarle al buscador
   * exactamente lo que no queremos que mire, así que el bloqueo tiene
   * que llevárselo puesto y no sólo cambiar las reglas.
   */
  it('en pruebas tampoco anuncia el sitemap', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'pruebas');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://pruebas.invicta.com.ar');
    expect(robots().sitemap).toBeUndefined();
  });
});
