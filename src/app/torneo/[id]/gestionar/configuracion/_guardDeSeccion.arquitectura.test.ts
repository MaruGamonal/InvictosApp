import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Toda pantalla de Configuración pide el rol **ella misma**, no sólo el
 * layout.
 *
 * **Por qué no alcanza con el layout.** En el App Router el layout y la
 * página se renderizan en paralelo: el `redirect` del layout gana la
 * navegación, pero no llega a evitar que la página haga sus consultas.
 * Lo mostró la primera corrida de la suite con sesión — un colaborador
 * entrando por URL a `/configuracion` dejaba un `SIN_PERMISO` en el log
 * del servidor. El servicio hacía bien su trabajo; el error viajaba a
 * Sentry igual, y un Sentry con ruido deja de mirarse.
 *
 * Nada falla visiblemente cuando una sección nueva se olvida esto: la
 * pantalla redirige igual. Por eso es un test y no una convención.
 */

const AQUI = __dirname;

function paginasDeConfiguracion(): string[] {
  const propia = join(AQUI, 'page.tsx');
  const secciones = readdirSync(AQUI)
    .filter((nombre) => statSync(join(AQUI, nombre)).isDirectory())
    .map((nombre) => join(AQUI, nombre, 'page.tsx'));
  return [propia, ...secciones];
}

describe('cada pantalla de Configuración exige el rol por su cuenta', () => {
  const paginas = paginasDeConfiguracion();

  it('hay secciones para revisar (si esto falla, el barrido está mal)', () => {
    expect(paginas.length).toBeGreaterThanOrEqual(9);
  });

  it.each(paginas)('%s', (ruta) => {
    const fuente = readFileSync(ruta, 'utf8');
    expect(
      fuente.includes('exigirQueOrganice'),
      `${ruta} no llama a exigirQueOrganice. El guard del layout no evita que esta página consulte: en el App Router los dos se renderizan en paralelo.`,
    ).toBe(true);

    // Y que sea lo primero que se espera, antes de cualquier otra
    // consulta: si va después, la consulta de arriba ya salió.
    const primerAwait = /^\s*(?:const [^=]+= )?await (\w+)/m.exec(
      fuente.slice(fuente.indexOf('await params;') + 'await params;'.length),
    );
    expect(
      primerAwait?.[1],
      `${ruta}: lo primero que espera después de los params tiene que ser exigirQueOrganice, y es ${primerAwait?.[1]}`,
    ).toBe('exigirQueOrganice');
  });
});
