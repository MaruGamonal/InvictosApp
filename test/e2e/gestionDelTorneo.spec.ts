import { test, expect, type Page } from '@playwright/test';
import { leerEscenario } from './_escenario';
import { iniciarSesion } from './_sesion';

/**
 * Las pantallas que **sólo existen con sesión**, abiertas de verdad en
 * un navegador.
 *
 * Era el agujero más grande de la verificación de este producto. Todo
 * lo demás —tipos, lint, 2275 unitarias, 108 de integración, el build—
 * estaba en verde cuando `/torneo/[id]/gestionar/configuracion` rompió
 * en producción: un `Set` exportado desde un módulo cliente, que Next
 * reemplaza por una referencia sin métodos. Nada de eso lo ve, porque
 * la prueba unitaria importa el módulo directo y ahí no hay frontera
 * cliente/servidor. Sólo lo agarra abrir la pantalla.
 *
 * Estas pruebas abren cada sección de gestión con la sesión del
 * titular. No afirman gran cosa de cada una a propósito: lo que
 * verifican es que **se rendericen**, que es exactamente lo que faltaba.
 *
 * La sesión la pone `_sesion.ts` escribiendo la cookie que
 * `@supabase/ssr` escribiría tras un login real; el servidor de GoTrue
 * del otro lado es `_gotrueFalso.mjs`. El código del producto que
 * resuelve quién sos y qué puede hacer no se tocó.
 */

const escenario = leerEscenario();

/** Un error de servidor se ve como una pantalla de error, no como un 500 crudo. */
async function sinErrorDeServidor(pagina: Page) {
  await expect(pagina.locator('body')).not.toContainText('Application error');
  await expect(pagina.locator('body')).not.toContainText('server-side exception');
}

test.describe('gestión del torneo, con sesión de titular', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, escenario.usuarios.titularId, { baseUrl: baseURL! });
  });

  test('la sesión queda puesta: el inicio ya no manda a ingresar', async ({ page }) => {
    // Si esto falla, todas las de abajo estarían pasando por
    // redirección a /ingresar en vez de por lo que dicen probar.
    await page.goto('/inicio');
    await expect(page).not.toHaveURL(/\/ingresar/);
  });

  const SECCIONES = [
    { ruta: 'resumen', titulo: /resumen|publicar/i },
    { ruta: 'equipos', titulo: /equipo/i },
    { ruta: 'fixture', titulo: /fixture|formato|programar/i },
    { ruta: 'resultados', titulo: /resultado/i },
    { ruta: 'configuracion', titulo: /configuraci/i },
  ] as const;

  for (const seccion of SECCIONES) {
    test(`la pestaña ${seccion.ruta} abre sin romperse`, async ({ page }) => {
      const respuesta = await page.goto(`/torneo/${escenario.torneoId}/gestionar/${seccion.ruta}`);
      expect(respuesta?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`/gestionar/${seccion.ruta}`));
      await sinErrorDeServidor(page);
      await expect(page.getByRole('heading', { name: escenario.torneoNombre })).toBeVisible();
    });
  }

  /**
   * Las ocho secciones de Configuración, una por una. Son las que
   * rompieron: la pantalla que crasheó en producción es una de éstas.
   */
  const SECCIONES_DE_CONFIGURACION = [
    'datos',
    'formato',
    'divisiones',
    'reglas',
    'reglamento',
    'colaboradores',
    'administradores',
    'estado',
  ] as const;

  for (const seccion of SECCIONES_DE_CONFIGURACION) {
    test(`configuración/${seccion} abre sin romperse`, async ({ page }) => {
      const respuesta = await page.goto(
        `/torneo/${escenario.torneoId}/gestionar/configuracion/${seccion}`,
      );
      expect(respuesta?.status()).toBe(200);
      await sinErrorDeServidor(page);
    });
  }

  test('`/gestionar` a secas lleva al resumen', async ({ page }) => {
    await page.goto(`/torneo/${escenario.torneoId}/gestionar`);
    await expect(page).toHaveURL(/\/gestionar\/resumen/);
  });
});

test.describe('gestión del torneo, con sesión de colaborador', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, escenario.usuarios.colaboradorId, { baseUrl: baseURL! });
  });

  /** `06`, D-32: permisos fijos, la operación de la fecha y nada más. */
  test('entra a Resultados, que es su trabajo', async ({ page }) => {
    const respuesta = await page.goto(`/torneo/${escenario.torneoId}/gestionar/resultados`);
    expect(respuesta?.status()).toBe(200);
    await sinErrorDeServidor(page);
    await expect(page).toHaveURL(/\/gestionar\/resultados/);
  });

  test('`/gestionar` a secas lo lleva a Resultados, no al Resumen', async ({ page }) => {
    await page.goto(`/torneo/${escenario.torneoId}/gestionar`);
    await expect(page).toHaveURL(/\/gestionar\/resultados/);
  });

  test('ve dos pestañas y no las otras tres', async ({ page }) => {
    await page.goto(`/torneo/${escenario.torneoId}/gestionar/resultados`);
    const pestanas = page.getByRole('navigation', { name: 'Secciones de gestión' });
    await expect(pestanas.getByRole('link', { name: 'Resultados' })).toBeVisible();
    await expect(pestanas.getByRole('link', { name: 'Fixture' })).toBeVisible();
    for (const oculta of ['Resumen', 'Equipos', 'Config.']) {
      await expect(pestanas.getByRole('link', { name: oculta })).toHaveCount(0);
    }
  });

  /**
   * Escribiendo la URL a mano tampoco. Y abajo, el servicio igual dice
   * que no: esconder la pestaña nunca fue la cerradura.
   */
  for (const prohibida of ['resumen', 'equipos', 'configuracion', 'configuracion/reglas']) {
    test(`escribir /${prohibida} a mano lo devuelve a Resultados`, async ({ page }) => {
      await page.goto(`/torneo/${escenario.torneoId}/gestionar/${prohibida}`);
      await expect(page).toHaveURL(/\/gestionar\/resultados/);
    });
  }
});

test.describe('gestión del torneo, con sesión ajena', () => {
  test('alguien sin vínculo no entra: lo manda a la ficha pública', async ({
    context,
    page,
    baseURL,
  }) => {
    await iniciarSesion(context, escenario.usuarios.ajenoId, { baseUrl: baseURL! });
    await page.goto(`/torneo/${escenario.torneoId}/gestionar/resultados`);
    await expect(page).toHaveURL(new RegExp(`/torneo/${escenario.torneoId}$`));
  });
});
