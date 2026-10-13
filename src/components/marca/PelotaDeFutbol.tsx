import styles from './MarcaInvicta.module.css';

/**
 * El isotipo de la marca: una pelota, en el acento.
 *
 * Reemplaza al cuadradito de 8px que había. Un cuadrado de color no
 * dice nada por sí mismo —podría ser de cualquier producto—; una
 * pelota dice de qué se trata esto antes de que se lea el nombre.
 *
 * **La geometría la decidió el tamaño, no el dibujo.** A 16px lo único
 * que importa es qué silueta queda, y eso costó dos vueltas:
 *
 * 1. Pentágono calado y costuras desde cada vértice hasta el borde: se
 *    empastaba, las cinco costuras se comían el disco.
 * 2. Pentágono **grande** y lleno con costuras cortas: dejó de
 *    empastarse pero las puntas se leían como una estrella o una flor.
 *    Reportado — "mejorá la pelota".
 * 3. Esta: pentágono **chico** y lleno, costuras finas que llegan al
 *    borde. El centro oscuro queda chico y las costuras parten el disco
 *    en gajos reconocibles en vez de irradiar desde el medio.
 *
 * Las tres se renderizaron a 16px y se compararon ahí, que es donde
 * vive. En grande cualquiera de las tres funciona, y por eso mirarla en
 * grande no sirve para elegir.
 *
 * Los gajos van en `--ink-900` porque la marca vive siempre sobre el
 * hero oscuro (ver `MarcaInvicta`), que es exactamente ese color: así
 * el calado es calado de verdad y no una línea de otro color encima.
 */
export function PelotaDeFutbol() {
  return (
    <svg className={styles.pelota} viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="11" fill="var(--acento)" />
      {/* El pentágono central, chico: es lo que vuelve pelota a un
          círculo, y si crece se come los gajos. */}
      <polygon
        points="12.00,7.40 16.37,10.58 14.70,15.72 9.30,15.72 7.63,10.58"
        fill="var(--ink-900)"
      />
      <g stroke="var(--ink-900)" strokeWidth="1.3" strokeLinecap="round">
        <path d="M12.00 7.40 12.00 1.40" />
        <path d="M16.37 10.58 22.08 8.72" />
        <path d="M14.70 15.72 18.23 20.58" />
        <path d="M9.30 15.72 5.77 20.58" />
        <path d="M7.63 10.58 1.92 8.72" />
      </g>
    </svg>
  );
}
