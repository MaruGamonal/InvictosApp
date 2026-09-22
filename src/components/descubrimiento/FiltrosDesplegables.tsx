import styles from './FiltrosDesplegables.module.css';

export interface OpcionDesplegable {
  valor: string;
  etiqueta: string;
}

export interface DesplegableDeFiltro {
  nombre: string;
  /** Texto del `aria-label` y de la opción «sin filtrar». */
  etiqueta: string;
  sinFiltrar: string;
  activo: string;
  opciones: OpcionDesplegable[];
}

export interface FiltrosDesplegablesProps {
  accion: string;
  /** Parámetros vigentes que hay que conservar; los propios se excluyen solos. */
  parametrosActuales: Record<string, string | undefined>;
  desplegables: DesplegableDeFiltro[];
}

/**
 * Los filtros de muchas opciones, en `/torneos` y en `/equipos`.
 *
 * Fueron chips por un rato y volvieron acá: modalidad son cinco valores
 * y categoría siete, así que entre las dos llenaban la pantalla de
 * chips antes del primer resultado. Un desplegable ocupa una línea
 * cualquiera sea la cantidad de opciones.
 *
 * Los chips se quedan para lo que sí gana con estar a la vista sin
 * desplegar nada: la duración del torneo (D-102) y el toggle de
 * inscripciones abiertas.
 *
 * Un solo formulario para los dos desplegables, con su botón: a
 * diferencia del chip —que envía al tocarlo— un `<select>` necesita
 * confirmar, y hacerlo con JavaScript dejaría el descubrimiento sin
 * funcionar cuando no lo hay, que es justo lo que esta pantalla evita.
 */
export function FiltrosDesplegables({
  accion,
  parametrosActuales,
  desplegables,
}: FiltrosDesplegablesProps) {
  const propios = new Set(desplegables.map((desplegable) => desplegable.nombre));

  return (
    <form method="get" action={accion} className={styles.fila} aria-label="Filtrar resultados">
      {Object.entries(parametrosActuales).map(([nombre, valor]) =>
        valor && !propios.has(nombre) && nombre !== 'cursor' ? (
          <input key={nombre} type="hidden" name={nombre} value={valor} />
        ) : null,
      )}
      {desplegables.map((desplegable) => (
        <select
          key={desplegable.nombre}
          name={desplegable.nombre}
          aria-label={desplegable.etiqueta}
          defaultValue={desplegable.activo}
          className={desplegable.activo ? `${styles.select} ${styles.selectActivo}` : styles.select}
        >
          <option value="">{desplegable.sinFiltrar}</option>
          {desplegable.opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      ))}
      <button type="submit" className={styles.boton}>
        Filtrar
      </button>
    </form>
  );
}
