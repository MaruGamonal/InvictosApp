import { crearError } from './errores';

/**
 * Paginación por cursor (`10`, 2.7): todo listado que pueda crecer se
 * pagina así, nunca con número de página — los listados de este producto
 * se ordenan por fecha y reciben filas nuevas mientras alguien scrollea.
 *
 * El cursor codifica la clave de orden completa de la última fila vista
 * (por ejemplo `[fecha, id]`, con el `id` como desempate para valores de
 * orden repetidos). Es lo que hace que insertar filas nuevas entre dos
 * lecturas no repita ni saltee nada: la página siguiente se define por
 * "lo que viene después de esta clave", no por un desplazamiento numérico
 * que una inserción corre.
 */

export type ValorDeOrden = string | number;

/** Compara dos claves compuestas en el mismo orden en que se ordena el listado. */
function compararClaves(a: readonly ValorDeOrden[], b: readonly ValorDeOrden[]): number {
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    if (av === bv) continue;
    return av! < bv! ? -1 : 1;
  }
  return 0;
}

export function codificarCursor(clave: readonly ValorDeOrden[]): string {
  return Buffer.from(JSON.stringify(clave), 'utf8').toString('base64url');
}

export function decodificarCursor(cursor: string): ValorDeOrden[] {
  try {
    const clave = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!Array.isArray(clave)) throw new Error('no es un arreglo');
    return clave;
  } catch {
    throw crearError('DATOS_INVALIDOS', [{ campo: 'cursor', problema: 'El cursor no es válido.' }]);
  }
}

/**
 * Devuelve la página siguiente de un listado ya ordenado, a partir de un
 * cursor opcional. `obtenerClave` extrae la clave de orden de cada fila,
 * en el mismo orden en que `filas` ya viene ordenado.
 */
export function paginar<T>(
  filas: readonly T[],
  opciones: {
    cursor?: string | null;
    tamanoPagina: number;
    obtenerClave: (fila: T) => ValorDeOrden[];
  },
): { pagina: T[]; cursorSiguiente: string | null } {
  const claveDesde = opciones.cursor ? decodificarCursor(opciones.cursor) : null;

  const restantes = claveDesde
    ? filas.filter((fila) => compararClaves(opciones.obtenerClave(fila), claveDesde) > 0)
    : filas;

  const pagina = restantes.slice(0, opciones.tamanoPagina);
  const hayMas = restantes.length > opciones.tamanoPagina;
  const ultima = pagina.at(-1);

  return {
    pagina,
    cursorSiguiente: hayMas && ultima ? codificarCursor(opciones.obtenerClave(ultima)) : null,
  };
}
