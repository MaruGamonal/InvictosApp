import styles from './CampoBusqueda.module.css';

export interface CampoBusquedaProps {
  /** A dónde envía el formulario: `/torneos` o `/equipos`. */
  accion: string;
  placeholder: string;
  etiqueta: string;
  valorInicial?: string;
  /** Parámetros actuales que hay que conservar al buscar por texto. */
  parametrosOcultos?: Record<string, string | undefined>;
}

/**
 * El buscador de las dos pantallas de descubrimiento (`/torneos` y
 * `/equipos`). Antes cada una tenía el suyo, con distinto alto, distinto
 * radio y una con lupa y la otra sin: pasar de una a la otra se sentía
 * como cambiar de aplicación.
 *
 * Formulario GET nativo, como el resto del descubrimiento: la URL sola
 * describe la búsqueda y funciona sin JavaScript.
 */
export function CampoBusqueda({
  accion,
  placeholder,
  etiqueta,
  valorInicial,
  parametrosOcultos,
}: CampoBusquedaProps) {
  return (
    <form method="get" action={accion} className={styles.busqueda} role="search">
      {Object.entries(parametrosOcultos ?? {}).map(([nombre, valor]) =>
        valor ? <input key={nombre} type="hidden" name={nombre} value={valor} /> : null,
      )}
      <svg
        className={styles.lupa}
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden
        focusable="false"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <input
        type="search"
        name="q"
        placeholder={placeholder}
        aria-label={etiqueta}
        defaultValue={valorInicial ?? ''}
        className={styles.campo}
      />
    </form>
  );
}
