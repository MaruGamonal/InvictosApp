import { test, expect, type Page } from '@playwright/test';
import { leerEscenario } from './_escenario';
import { iniciarSesion } from './_sesion';

const escenario = leerEscenario();

/**
 * Ningún control de las pantallas principales mide menos de 24px de
 * lado (WCAG 2.5.8; `08`, 6.5: "áreas táctiles nunca menores al mínimo
 * accesible").
 *
 * Por qué de punta a punta. El tamaño sale del CSS ya aplicado —una
 * clase local que pisa a la compuesta, un `display: block` que anula el
 * alto mínimo—, y eso sólo lo ve un navegador. Pasó: veinte enlaces y
 * botones de texto medían entre 12 y 19px de alto ("← Volver", "Ver
 * tabla", "Ingresar" de la cabecera, "Subir escudo") y los checkboxes,
 * 13px.
 *
 * Se mide a 360px, el teléfono más angosto que se soporta. Un enlace
 * dentro de un párrafo queda exceptuado, como dice WCAG.
 */
async function controlesChicos(pagina: Page): Promise<string[]> {
  return pagina.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"]',
      ),
    )
      .filter((el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
      .filter(
        (el) =>
          !(el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p')),
      )
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && Math.min(r.width, r.height) < 24)
      .map(
        ({ el, r }) =>
          `${el.tagName.toLowerCase()} «${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}» ${Math.round(r.width)}×${Math.round(r.height)}px`,
      ),
  );
}

async function revisar(pagina: Page, ruta: string) {
  await pagina.setViewportSize({ width: 360, height: 800 });
  await pagina.goto(ruta);
  await pagina.waitForLoadState('networkidle');
  expect(await controlesChicos(pagina), `${ruta}: controles de menos de 24px`).toEqual([]);
}

const t = escenario.torneoId;

test.describe('áreas táctiles, sin sesión', () => {
  for (const ruta of [
    '/',
    '/torneos',
    '/ingresar',
    `/torneo/${t}`,
    `/torneo/${t}/fixture`,
    `/torneo/${t}/tabla`,
    `/torneo/${t}/partido/${escenario.partidoConResultadoId}`,
    `/equipo/${escenario.equipoDelCapitanId}`,
  ]) {
    test(ruta.replace(/[0-9a-f-]{36}/g, '[id]'), async ({ page }) => {
      await revisar(page, ruta);
    });
  }
});

test.describe('áreas táctiles, organizador', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, escenario.usuarios.titularId, { baseUrl: baseURL! });
  });
  for (const ruta of [
    '/inicio',
    '/organizador/gestionar',
    `/torneo/${t}/gestionar/resultados`,
    `/torneo/${t}/gestionar/configuracion/datos`,
    '/torneo/crear',
  ]) {
    test(ruta.replace(/[0-9a-f-]{36}/g, '[id]'), async ({ page }) => {
      await revisar(page, ruta);
    });
  }
});

test.describe('áreas táctiles, capitán', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, escenario.usuarios.capitanId, { baseUrl: baseURL! });
  });
  for (const ruta of [
    `/equipo/${escenario.equipoDelCapitanId}/gestionar`,
    `/torneo/${t}/equipo/${escenario.equipoDelCapitanId}/lista-buena-fe`,
  ]) {
    test(ruta.replace(/[0-9a-f-]{36}/g, '[id]'), async ({ page }) => {
      await revisar(page, ruta);
    });
  }
});
