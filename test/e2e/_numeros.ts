import { expect, type Page } from '@playwright/test';

/**
 * El valor de uno de los números del jugador (un par `<dt>`/`<dd>` de
 * `NumerosDelJugador`) según su etiqueta: "Goles" → "3".
 */
export async function expectNumero(page: Page, etiqueta: string, valor: string) {
  const par = page.locator('dl > div').filter({ has: page.locator('dt', { hasText: etiqueta }) });
  await expect(par.locator('dd')).toHaveText(valor);
}
