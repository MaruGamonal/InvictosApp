import { defineConfig, devices } from '@playwright/test';

/**
 * T27 — Suite de punta a punta: abre la aplicación de verdad en un
 * navegador y hace clic. Es lo único que verifica que el botón lleve a
 * la pantalla correcta, que el formulario mande lo que muestra y que la
 * página se arme con los datos que la base tiene — nada de eso lo
 * cubren las pruebas unitarias ni las de integración.
 *
 * Corre contra la aplicación **construida** (`npm start`), no contra
 * `next dev`: lo que se prueba tiene que ser lo que se despliega. El
 * `webServer` la levanta y la apaga sola.
 *
 * `CHROMIUM_EJECUTABLE` permite apuntar a un Chromium ya instalado en
 * el sistema. Sin esa variable se usa el que Playwright baja con
 * `npx playwright install chromium`, que es el camino normal.
 */

const PUERTO = Number(process.env.PUERTO_E2E ?? 3100);
const BASE_URL = `http://127.0.0.1:${PUERTO}`;

const ejecutable = process.env.CHROMIUM_EJECUTABLE;

export default defineConfig({
  testDir: './test/e2e',
  // Comparten una sola base sembrada: en paralelo se pisarían.
  fullyParallel: false,
  workers: 1,
  // En CI, que una prueba en verde por reintento no pase por verde.
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    // El producto es una aplicación de teléfono: `--ancho-aplicacion`
    // son 480px. Probarla a 1280 sería probar otra cosa.
    ...devices['Pixel 7'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Pixel 7'],
        launchOptions: ejecutable ? { executablePath: ejecutable } : {},
      },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PUERTO}`,
    url: `${BASE_URL}/api/salud`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
