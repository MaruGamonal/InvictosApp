import { test, expect } from '@playwright/test';
import { leerEscenario } from './_escenario';

const escenario = leerEscenario();

/**
 * La ficha pública y sus pestañas. D-04b: todo esto se sirve sin
 * cuenta, y la cuenta se pide recién al tocar una acción.
 */
test.describe('la ficha pública del torneo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/torneo/${escenario.torneoId}`);
  });

  test('muestra el torneo y los equipos inscriptos', async ({ page }) => {
    await expect(page.getByRole('heading', { name: escenario.torneoNombre })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Equipos inscriptos' })).toBeVisible();

    for (const nombre of escenario.equipoNombres) {
      await expect(page.getByText(nombre).first()).toBeVisible();
    }
  });

  test('las pestañas llevan al fixture y a la tabla', async ({ page }) => {
    await page.getByRole('link', { name: 'Fixture', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/torneo/${escenario.torneoId}/fixture`));
    await expect(page.getByText('Fecha 1').first()).toBeVisible();

    await page.getByRole('link', { name: 'Tabla', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/torneo/${escenario.torneoId}/tabla`));
  });

  /**
   * El resultado que dejó el sembrado fue 3 a 1, así que la tabla tiene
   * filas: sin ningún resultado cargado, `posicion` queda vacía y la
   * pantalla muestra su estado vacío.
   */
  test('la tabla de posiciones trae a los equipos que ya jugaron', async ({ page }) => {
    await page.goto(`/torneo/${escenario.torneoId}/tabla`);
    await expect(page.getByText('Todavía no hay tabla de posiciones')).toBeHidden();

    // La tabla se arma con `div`s, no con `<table>`: no hay `role="row"`
    // que contar. Lo que se verifica es que esté el encabezado de puntos
    // y que aparezcan los dos equipos del partido que se cargó.
    await expect(page.getByText('Pts', { exact: true })).toBeVisible();
    const presentes = await Promise.all(
      escenario.equipoNombres.map((nombre) => page.getByText(nombre).count()),
    );
    expect(presentes.filter((cantidad) => cantidad > 0).length).toBeGreaterThanOrEqual(2);
  });

  test('se sirve sin cuenta: no manda a ingresar', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(`/torneo/${escenario.torneoId}$`));
    await expect(page.getByRole('heading', { name: escenario.torneoNombre })).toBeVisible();
  });
});
