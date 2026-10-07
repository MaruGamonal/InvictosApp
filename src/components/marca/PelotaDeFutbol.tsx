import styles from './MarcaInvicta.module.css';

/**
 * El isotipo de la marca: una pelota, en el acento.
 *
 * Reemplaza al cuadradito de 8px que había. Un cuadrado de color no
 * dice nada por sí mismo —podría ser de cualquier producto—; una
 * pelota dice de qué se trata esto antes de que se lea el nombre.
 *
 * **Por qué el pentágono va lleno y las costuras cortas.** El primer
 * intento dibujaba la pelota "bien": pentágono calado y una costura
 * desde cada vértice hasta el borde. A 16px eso se empasta — las cinco
 * costuras se comen el disco y la figura se lee como una flor o un
 * engranaje, no como una pelota. Con el pentágono lleno y las costuras
 * cortadas a mitad de camino queda una silueta que se reconoce de un
 * vistazo, que es lo único que un isotipo de 16px tiene que lograr.
 * (Comparado contra las otras tres variantes, renderizadas al tamaño
 * real antes de elegir.)
 *
 * Los gajos van en `--ink-900` porque la marca vive siempre sobre el
 * hero oscuro (ver `MarcaInvicta`), que es exactamente ese color: así
 * el calado es calado de verdad y no una línea de otro color encima.
 */
export function PelotaDeFutbol() {
  return (
    <svg className={styles.pelota} viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="11" fill="var(--acento)" />
      {/* El pentágono central: lo que vuelve pelota a un círculo. */}
      <polygon points="12,6.2 17.52,10.2 15.41,16.7 8.59,16.7 6.48,10.2" fill="var(--ink-900)" />
      <g stroke="var(--ink-900)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 6.2V2" />
        <path d="M17.52 10.2 21.3 9" />
        <path d="M15.41 16.7 17.8 20" />
        <path d="M8.59 16.7 6.2 20" />
        <path d="M6.48 10.2 2.7 9" />
      </g>
    </svg>
  );
}
