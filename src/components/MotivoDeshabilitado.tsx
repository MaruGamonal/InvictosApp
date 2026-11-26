/**
 * Por qué un botón está deshabilitado, dicho al lado del botón.
 *
 * Un botón gris que no se puede tocar y no explica nada deja a la persona
 * adivinando qué le falta: pasaba en "Ingresar" (sin correo o sin
 * contraseña) y en "Cargar" (con un solo marcador escrito). El motivo se
 * muestra mientras falte algo y el botón lo referencia con
 * `aria-describedby`, así que el lector de pantalla lo lee al llegar al
 * botón.
 *
 * Uso:
 *   const motivo = !correo ? 'Falta el correo.' : null;
 *   <button disabled={!!motivo} aria-describedby={motivo ? 'motivo-x' : undefined}>
 *   <MotivoDeshabilitado id="motivo-x" motivo={motivo} />
 *
 * Mientras se envía no va motivo: "Enviando…" en el botón ya lo dice.
 */
import styles from './MotivoDeshabilitado.module.css';

type Props = {
  id: string;
  motivo: string | null;
};

export function MotivoDeshabilitado({ id, motivo }: Props) {
  if (!motivo) return null;
  return (
    <p id={id} className={styles.motivo}>
      {motivo}
    </p>
  );
}

/**
 * "Falta completar el correo y la contraseña." a partir de lo que falta,
 * o `null` si no falta nada.
 */
export function motivoPorFaltantes(faltantes: string[]): string | null {
  if (faltantes.length === 0) return null;
  const lista =
    faltantes.length === 1
      ? faltantes[0]
      : `${faltantes.slice(0, -1).join(', ')} y ${faltantes[faltantes.length - 1]}`;
  return `Falta completar ${lista}.`;
}
