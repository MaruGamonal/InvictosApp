import { test, expect } from '@playwright/test';
import { leerEscenario } from './_escenario';

const escenario = leerEscenario();

/**
 * El recorrido de quien llega sin cuenta: buscar un torneo cerca y
 * abrirlo. Es el único que verifica la parte que no se puede probar sin
 * navegador — la ciudad se guarda en una **cookie** que escribe una
 * Server Action, y recién entonces el servidor vuelve a armar la página
 * con los torneos de esa ciudad.
 */
test.describe('descubrir un torneo sin cuenta', () => {
  test('elegir la ciudad deja ver el torneo, y se entra a su ficha', async ({ page }) => {
    await page.goto('/torneos');

    // Sin ciudad elegida todavía: lo primero es el selector.
    await expect(page.getByRole('heading', { name: 'Torneos cerca de vos' })).toBeVisible();
    await expect(
      page.getByText('Elegí tu ciudad para ver los torneos cerca de vos.'),
    ).toBeVisible();

    await page.getByLabel('Buscar ciudad').fill(escenario.ciudadNombre);
    await page.getByRole('button', { name: escenario.ciudadNombre }).click();

    // La cookie quedó puesta y el servidor rearmó la página con el torneo.
    // Por el texto y no por el nombre accesible: la tarjeta es un enlace
    // que envuelve un `<article>`, y su nombre accesible queda vacío.
    const tarjeta = page.getByRole('link').filter({ hasText: escenario.torneoNombre });
    await expect(tarjeta).toBeVisible();

    await tarjeta.click();
    await expect(page).toHaveURL(new RegExp(`/torneo/${escenario.torneoId}`));
    await expect(page.getByRole('heading', { name: escenario.torneoNombre })).toBeVisible();
  });

  test('la ciudad elegida se recuerda al volver', async ({ page }) => {
    await page.goto('/torneos');
    await page.getByLabel('Buscar ciudad').fill(escenario.ciudadNombre);
    await page.getByRole('button', { name: escenario.ciudadNombre }).click();
    await expect(page.getByRole('link').filter({ hasText: escenario.torneoNombre })).toBeVisible();

    // Segunda visita: ya no vuelve a preguntar.
    await page.goto('/torneos');
    await expect(page.getByText('Elegí tu ciudad para ver los torneos cerca de vos.')).toBeHidden();
    await expect(page.getByRole('link').filter({ hasText: escenario.torneoNombre })).toBeVisible();
  });
});
