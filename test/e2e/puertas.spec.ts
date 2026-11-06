import { test, expect } from '@playwright/test';

/**
 * Las puertas: qué se sirve sin cuenta y qué no. Son afirmaciones que
 * sólo tienen sentido contra la aplicación construida —`npm start`,
 * `NODE_ENV=production`—, porque alguna de ellas depende justamente de
 * no estar en desarrollo.
 */
test.describe('puertas de acceso', () => {
  test('el catálogo del sistema de diseño no existe fuera de desarrollo', async ({ page }) => {
    const respuesta = await page.goto('/catalogo');
    expect(respuesta?.status()).toBe(404);
  });

  test('sin sesión, el inicio manda a ingresar', async ({ page }) => {
    await page.goto('/inicio');
    await expect(page).toHaveURL(/\/ingresar/);
    await expect(page.getByRole('heading', { name: 'Ingresar' })).toBeVisible();
  });

  test('la pantalla de ingresar ofrece crear cuenta', async ({ page }) => {
    await page.goto('/ingresar');
    await expect(page.getByLabel('Correo')).toBeVisible();
    await expect(page.getByLabel('Recordarme')).toBeChecked();

    await page.getByRole('link', { name: 'Creala en un momento' }).click();
    await expect(page).toHaveURL(/modo=crear/);
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
    // Crear cuenta no ofrece "Recordarme": la sesión queda abierta.
    await expect(page.getByLabel('Recordarme')).toBeHidden();
  });

  test('la portada lleva a descubrir torneos sin pedir cuenta', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /torneos|Descubrir/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/torneos/);
  });

  /**
   * La banda que separa este sitio del real.
   *
   * Es la comprobación más barata de que las variables quedaron de cada
   * lado: en el ambiente de pruebas se ve, en producción no existe. Y
   * es la que un humano hace al final del runbook — tenerla acá
   * significa que, si un deploy la rompe, se entera la suite y no la
   * primera persona que abra el sitio equivocado.
   */
  test('en el ambiente de pruebas avisa que los datos no son reales', async ({ page }) => {
    await page.goto('/torneos');
    const banda = page.getByRole('status').filter({ hasText: /ambiente de pruebas/i });
    await expect(banda).toBeVisible();
    await expect(banda).toContainText('los datos no son reales');
  });
});
