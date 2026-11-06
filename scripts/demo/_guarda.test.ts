import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describirBase, exigirAmbienteDePruebas } from './_guarda';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function espiarSalida() {
  const salir = vi.spyOn(process, 'exit').mockImplementation(((codigo?: number) => {
    throw new Error(`process.exit(${codigo})`);
  }) as never);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  return { salir, error };
}

describe('exigirAmbienteDePruebas', () => {
  it('en pruebas deja seguir', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'pruebas');
    espiarSalida();
    expect(() => exigirAmbienteDePruebas('sembrar')).not.toThrow();
  });

  /**
   * El caso que justifica todo esto. El accidente no es simétrico: un
   * ambiente de pruebas sin datos se resiembra en un minuto; producción
   * con datos `[DEMO]` entre torneos de gente real ya la vio todo el
   * mundo antes de que alguien lo note.
   */
  it('en producción corta, con código 1', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', 'produccion');
    const { salir, error } = espiarSalida();
    expect(() => exigirAmbienteDePruebas('sembrar datos demo')).toThrow('process.exit(1)');
    expect(salir).toHaveBeenCalledWith(1);
    expect(error.mock.calls.flat().join(' ')).toContain('sembrar datos demo');
  });

  it('sin la variable también corta: el default es producción', () => {
    vi.stubEnv('NEXT_PUBLIC_AMBIENTE', '');
    const { salir } = espiarSalida();
    expect(() => exigirAmbienteDePruebas('borrar')).toThrow();
    expect(salir).toHaveBeenCalledWith(1);
  });
});

describe('describirBase', () => {
  /** Lo que se imprime no puede llevar la contraseña: queda en logs y en capturas. */
  it('dice host y base, nunca la contraseña', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://usuario:secretisimo@db.ejemplo.com:5432/invicta');
    const descripcion = describirBase();
    expect(descripcion).toContain('db.ejemplo.com');
    expect(descripcion).toContain('invicta');
    expect(descripcion).not.toContain('secretisimo');
    expect(descripcion).not.toContain('usuario');
  });

  it('sin la variable lo dice en vez de romper', () => {
    vi.stubEnv('DATABASE_URL', '');
    expect(describirBase()).toContain('no está configurada');
  });
});

/**
 * Que un script nuevo que escriba datos demo no pueda olvidarse la
 * guarda. Nada falla cuando se olvida: el script anda perfecto — contra
 * la base que sea.
 *
 * `auditar.ts` está deliberadamente afuera: existe para correrse contra
 * producción, así que negarse a correr ahí sería negarse a hacer lo
 * único que hace. Es de sólo lectura, y hay un test de eso abajo.
 */
describe('todo script que escriba datos demo pasa por la guarda', () => {
  const CARPETA = __dirname;
  const SOLO_LECTURA = ['auditar.ts', 'validar.ts'];

  const scripts = readdirSync(CARPETA).filter(
    (nombre) => nombre.endsWith('.ts') && !nombre.endsWith('.test.ts') && !nombre.startsWith('_'),
  );

  it('hay scripts para revisar (si esto falla, el barrido está mal)', () => {
    expect(scripts.length).toBeGreaterThanOrEqual(3);
  });

  /**
   * Se busca la **llamada**, no el nombre. La primera versión de esto
   * miraba si el archivo mencionaba `exigirAmbienteDePruebas` y pasaba
   * con sólo el `import`: sacarle la llamada a `sembrar.ts` no la hacía
   * fallar. Un test que pasa por la razón equivocada es peor que no
   * tenerlo, porque además tranquiliza.
   */
  const LLAMA_A_LA_GUARDA = /exigirAmbienteDePruebas\s*\(/;

  it.each(scripts)('%s', (nombre) => {
    const fuente = readFileSync(join(CARPETA, nombre), 'utf8');
    const escribe = /\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(fuente);

    if (SOLO_LECTURA.includes(nombre)) {
      expect(escribe, `${nombre} está en la lista de sólo lectura y escribe`).toBe(false);
      expect(
        LLAMA_A_LA_GUARDA.test(fuente),
        `${nombre} corre contra producción a propósito: no tiene que tener la guarda`,
      ).toBe(false);
      return;
    }

    expect(
      LLAMA_A_LA_GUARDA.test(fuente),
      `${nombre} escribe en la base y no llama a exigirAmbienteDePruebas. Sin eso corre contra lo que diga DATABASE_URL, producción incluida.`,
    ).toBe(true);
  });
});
