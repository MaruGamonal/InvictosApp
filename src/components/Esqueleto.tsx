import styles from './Esqueleto.module.css';

/**
 * Lo que se ve mientras el servidor arma una pantalla (`loading.tsx`).
 *
 * No había ningún estado de carga: en la red de una cancha, tocar un
 * enlace no daba ninguna respuesta hasta que la pantalla nueva estaba
 * entera, y se volvía a tocar (checklist de estados: "cargando —
 * esqueleto o indicador"). La forma —bloques del tamaño de una tarjeta—
 * evita además que el contenido salte cuando llega.
 *
 * Con `conCabecera`, dibuja también la banda de la cabecera: para las
 * pantallas cuya cabecera es parte de la página y no de un layout.
 */
export function Esqueleto({
  tarjetas = 3,
  conCabecera = false,
}: {
  tarjetas?: number;
  conCabecera?: boolean;
}) {
  return (
    <div className={styles.esqueleto} role="status" aria-live="polite">
      <span className="solo-lector">Cargando…</span>
      {conCabecera && <div className={styles.cabecera} aria-hidden="true" />}
      <div className={styles.contenido} aria-hidden="true">
        <div className={styles.titulo} />
        {Array.from({ length: tarjetas }, (_, i) => (
          <div key={i} className={styles.tarjeta} />
        ))}
      </div>
    </div>
  );
}
