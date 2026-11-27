import { test, expect } from '@playwright/test';
import { expectNumero } from './_numeros';
import { leerEscenario } from './_escenario';

const escenario = leerEscenario();

/**
 * UC-38 — El historial del jugador. El sembrado deja al capitán del
 * equipo local con tres goles en el torneo, así que su perfil tiene algo
 * que mostrar.
 */
test.describe('el perfil público del jugador', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/jugador/${escenario.perfilConHistorialId}`);
  });

  test('muestra el nombre y los equipos sin pedir cuenta', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: escenario.perfilConHistorialNombre }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Equipos' })).toBeVisible();
  });

  test('lista el torneo jugado, con el equipo y los goles', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Torneos jugados' })).toBeVisible();
    await expect(page.getByText(escenario.torneoNombre)).toBeVisible();
    await expect(page.getByText('⚽ 3 goles')).toBeVisible();
    // UC-38: el dato que no existía hasta que hubo alineación por partido.
    await expect(page.getByText('1 partido', { exact: true })).toBeVisible();
  });

  /** Los totales de la carrera, arriba de todo: lo primero que se busca. */
  test('muestra los números: goles, jugador del partido y tarjetas', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Números' })).toBeVisible();
    await expectNumero(page, 'Goles', '3');
    await expectNumero(page, 'Jugador del partido', '1');
    await expectNumero(page, 'Amarillas', '1');
    // En un total el cero sí es un dato.
    await expectNumero(page, 'Rojas', '0');
  });

  test('el torneo del historial lleva a su ficha', async ({ page }) => {
    await page.getByRole('link').filter({ hasText: escenario.torneoNombre }).first().click();
    await expect(page).toHaveURL(new RegExp(`/torneo/${escenario.torneoId}`));
  });
});
