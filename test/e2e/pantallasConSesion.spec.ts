import { test, expect, type Page } from '@playwright/test';
import { leerEscenario } from './_escenario';
import { iniciarSesion } from './_sesion';

/**
 * Cada pantalla que **sólo existe con sesión**, abierta de verdad.
 *
 * El producto tiene dieciocho rutas detrás de un `redirect('/ingresar')`
 * y hasta ahora la suite abría una sola familia (la gestión del
 * torneo). Las demás nunca las vio un navegador — y es exactamente el
 * lugar donde ya rompió una vez: un `Set` exportado desde un módulo
 * cliente, invisible para los tipos, el build y las unitarias.
 *
 * La mayoría de estas pruebas no afirma gran cosa de cada pantalla, a
 * propósito: lo que verifican es que **se rendericen**. Esa es la
 * afirmación que faltaba. Donde sí hay algo reciente que mirar —el chip
 * de modo, la hoja de selección, el color de la cabecera, el botón que
 * se fue del inicio del panel— la prueba lo nombra.
 */

const escenario = leerEscenario();

async function sinErrorDeServidor(pagina: Page) {
  await expect(pagina.locator('body')).not.toContainText('Application error');
  await expect(pagina.locator('body')).not.toContainText('server-side exception');
}

/** Abre la ruta, exige 200 y que no haya reventado del lado del servidor. */
async function abre(pagina: Page, ruta: string) {
  const respuesta = await pagina.goto(ruta);
  expect(respuesta?.status(), `${ruta} no devolvió 200`).toBe(200);
  await sinErrorDeServidor(pagina);
}

test.describe('el modo jugador, con sesión', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, escenario.usuarios.titularId, { baseUrl: baseURL! });
  });

  for (const ruta of [
    '/inicio',
    '/perfil',
    '/perfil/editar',
    '/notificaciones',
    '/notificaciones/preferencias',
  ]) {
    test(`${ruta} abre sin romperse`, async ({ page }) => {
      await abre(page, ruta);
    });
  }

  for (const ruta of ['/equipo/crear', '/torneo/crear']) {
    test(`${ruta} abre sin romperse`, async ({ page }) => {
      await abre(page, ruta);
    });
  }

  /**
   * El chip de modo vive en un módulo cliente (`HojaDeOpciones`), que
   * es justo la clase de archivo que rompió en producción. Hasta ahora
   * sólo lo habían visto las unitarias, que importan el módulo directo
   * y por eso no tienen frontera cliente/servidor.
   */
  test('el chip dice en qué modo estás, y abre la hoja con los dos', async ({ page }) => {
    await abre(page, '/inicio');

    const chip = page.getByLabel('Modo: Jugador');
    await expect(chip).toBeVisible();

    await chip.click();
    const hoja = page.getByRole('group', { name: /elegí cómo usar/i });
    await expect(hoja).toBeVisible();
    await expect(hoja.getByText('Modo organizador')).toBeVisible();
    await expect(hoja.getByText(/tus equipos, los torneos que jugás/i)).toBeVisible();
  });

  test('desde la hoja se cruza al modo organizador', async ({ page }) => {
    await abre(page, '/inicio');
    await page.getByLabel('Modo: Jugador').click();
    await page.getByRole('link', { name: /modo organizador/i }).click();
    await expect(page).toHaveURL(/\/organizador\/gestionar/);
  });

  /** Cerrar tocando afuera es la mejora que agrega el JavaScript. */
  test('la hoja se cierra con Escape', async ({ page }) => {
    await abre(page, '/inicio');
    await page.getByLabel('Modo: Jugador').click();
    await expect(page.getByRole('group', { name: /elegí cómo usar/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('group', { name: /elegí cómo usar/i })).toBeHidden();
  });
});

test.describe('el panel de organizador, con sesión', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, escenario.usuarios.titularId, { baseUrl: baseURL! });
  });

  for (const ruta of [
    '/organizador/gestionar',
    '/organizador/gestionar/torneos',
    '/organizador/gestionar/equipo',
    '/organizador/gestionar/perfil',
    '/organizador/gestionar/crear',
    '/organizador/gestionar/invitar',
  ]) {
    test(`${ruta} abre sin romperse`, async ({ page }) => {
      await abre(page, ruta);
    });
  }

  test('el chip dice Organizador de este lado', async ({ page }) => {
    await abre(page, '/organizador/gestionar');
    await expect(page.getByLabel('Modo: Organizador')).toBeVisible();
  });

  /**
   * La cabecera es de otro color de este lado, y ése es todo el punto:
   * antes los dos modos usaban el mismo fondo. Se compara el color
   * calculado contra el del modo jugador, no contra un valor escrito
   * acá: lo que importa es que sean **distintos**.
   */
  test('la cabecera es de otro color que la de jugador', async ({ page }) => {
    await abre(page, '/inicio');
    const deJugador = await page
      .locator('header')
      .first()
      .evaluate((nodo) => getComputedStyle(nodo).backgroundImage);

    await abre(page, '/organizador/gestionar');
    const deOrganizador = await page
      .locator('header')
      .first()
      .evaluate((nodo) => getComputedStyle(nodo).backgroundImage);

    expect(deJugador).not.toBe('none');
    expect(deOrganizador).not.toBe('none');
    expect(deOrganizador).not.toBe(deJugador);
  });

  /** Estaba repetido en Inicio y en Torneos; quedó sólo en Torneos. */
  test('"Crear torneo" está en Torneos y no en el Inicio del panel', async ({ page }) => {
    await abre(page, '/organizador/gestionar');
    await expect(page.getByRole('button', { name: /crear torneo/i })).toHaveCount(0);

    await abre(page, '/organizador/gestionar/torneos');
    await expect(page.getByRole('button', { name: /crear torneo/i })).toBeVisible();
  });

  /**
   * Con una sola organización no hay entre qué elegir: el nombre va
   * como etiqueta al lado del tuyo, sin fila propia ni flecha.
   */
  test('con una sola organización no ofrece elegirla', async ({ page }) => {
    await abre(page, '/organizador/gestionar');
    await expect(page.getByText(escenario.organizacionNombre).first()).toBeVisible();
    await expect(
      page.getByLabel(new RegExp(`Organización que estás gestionando`, 'i')),
    ).toHaveCount(0);
  });
});

test.describe('la gestión de un equipo, con sesión de capitán', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, escenario.usuarios.capitanId, { baseUrl: baseURL! });
  });

  for (const sufijo of ['', '/invitar', '/solicitudes']) {
    test(`/equipo/[id]/gestionar${sufijo} abre sin romperse`, async ({ page }) => {
      await abre(page, `/equipo/${escenario.equipoDelCapitanId}/gestionar${sufijo}`);
    });
  }

  test('la lista de buena fe de su equipo abre', async ({ page }) => {
    await abre(
      page,
      `/torneo/${escenario.torneoId}/equipo/${escenario.equipoDelCapitanId}/lista-buena-fe`,
    );
  });

  /**
   * El formulario que el capitán usa para cargar el resultado de su
   * partido (`06`, D-07b). Existía el permiso desde siempre y ninguna
   * pantalla lo ofrecía; esto verifica que ahora sí, en el navegador.
   */
  test('en su partido pendiente le ofrece cargar el resultado', async ({ page }) => {
    await abre(page, `/torneo/${escenario.torneoId}/partido/${escenario.partidoSinResultadoId}`);
    await expect(page.getByRole('button', { name: /cargar/i }).first()).toBeVisible();
  });
});

test.describe('lo que una sesión ajena no puede abrir', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await iniciarSesion(context, escenario.usuarios.ajenoId, { baseUrl: baseURL! });
  });

  test('la gestión de un equipo que no es suyo', async ({ page }) => {
    await page.goto(`/equipo/${escenario.equipoDelCapitanId}/gestionar`);
    await expect(page).not.toHaveURL(/\/gestionar$/);
  });

  test('el partido de otros no le ofrece cargar nada', async ({ page }) => {
    await abre(page, `/torneo/${escenario.torneoId}/partido/${escenario.partidoSinResultadoId}`);
    await expect(page.getByRole('button', { name: /^cargar/i })).toHaveCount(0);
  });
});
