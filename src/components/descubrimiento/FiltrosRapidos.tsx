import styles from './FiltrosRapidos.module.css';

export interface OpcionDeFiltro {
  valor: string;
  etiqueta: string;
}

export interface ParametroDeFiltro {
  /** Nombre del parámetro en la URL. */
  nombre: string;
  /** Valor activo hoy; cadena vacía cuando no hay ninguno. */
  activo: string;
  opciones: OpcionDeFiltro[];
}

export interface FilaDeFiltros {
  /** Para el `aria-label` del formulario de esa fila. */
  etiqueta: string;
  parametros: ParametroDeFiltro[];
}

export interface FiltrosRapidosProps {
  accion: string;
  /** Todos los parámetros vigentes de la URL, para no perderlos al filtrar. */
  parametrosActuales: Record<string, string | undefined>;
  filas: FilaDeFiltros[];
}

/**
 * Los filtros del descubrimiento, iguales en `/torneos` y en `/equipos`.
 *
 * Antes eran dos sistemas distintos: torneos usaba chips para la
 * duración y `<select>` para el resto, equipos usaba `<select>` y un
 * botón «Buscar». Mismos filtros, dos formas de usarlos.
 *
 * Ahora las dos pantallas usan chips, y **cambian solo las opciones**:
 * no se agregó ningún criterio de filtrado que no existiera.
 *
 * Cada chip es el `submit` de un formulario GET, así que filtrar no
 * necesita JavaScript. Tocar el chip activo manda cadena vacía y lo
 * apaga: esa es la forma de limpiar un filtro, y es la misma para todos.
 *
 * Una fila, un formulario. Si todos los chips compartieran uno, el
 * `input` oculto que conserva un parámetro viajaría junto al botón que
 * lo cambia y el servidor recibiría dos valores para el mismo nombre.
 * Por eso cada formulario lleva ocultos **los demás** parámetros, nunca
 * los suyos.
 */
export function FiltrosRapidos({ accion, parametrosActuales, filas }: FiltrosRapidosProps) {
  return (
    <div className={styles.bloque}>
      {filas.map((fila) => {
        const propios = new Set(fila.parametros.map((parametro) => parametro.nombre));
        return (
          <form key={fila.etiqueta} method="get" action={accion} aria-label={fila.etiqueta}>
            {Object.entries(parametrosActuales).map(([nombre, valor]) =>
              valor && !propios.has(nombre) && nombre !== 'cursor' ? (
                <input key={nombre} type="hidden" name={nombre} value={valor} />
              ) : null,
            )}
            <div className={styles.fila}>
              {fila.parametros.flatMap((parametro) =>
                parametro.opciones.map((opcion) => {
                  const activo = parametro.activo === opcion.valor;
                  return (
                    <button
                      key={`${parametro.nombre}:${opcion.valor}`}
                      type="submit"
                      name={parametro.nombre}
                      // Tocar el chip activo lo apaga.
                      value={activo ? '' : opcion.valor}
                      aria-pressed={activo}
                      className={activo ? `${styles.chip} ${styles.chipActivo}` : styles.chip}
                    >
                      {opcion.etiqueta}
                    </button>
                  );
                }),
              )}
            </div>
          </form>
        );
      })}
    </div>
  );
}
