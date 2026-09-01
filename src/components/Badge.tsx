import { obtenerEtiqueta, type ColorSemantico } from '@/lib/etiquetas';
import styles from './Badge.module.css';

type CampoDeEtiqueta = Parameters<typeof obtenerEtiqueta>[0];

export interface BadgeProps {
  campo: CampoDeEtiqueta;
  valor: string;
}

const CLASE_POR_COLOR: Record<ColorSemantico, string> = {
  exito: styles.exito!,
  informacion: styles.informacion!,
  advertencia: styles.advertencia!,
  error: styles.error!,
  neutro: styles.neutro!,
};

/**
 * Badge de estado (`08`, 11.10). Resuelve la etiqueta visible y el color
 * semántico desde `04` — nunca recibe un texto o un color sueltos, así
 * que es imposible que muestre un valor técnico por error.
 *
 * La etiqueta de texto siempre está presente: el estado se entiende sin
 * leer el color (accesibilidad, y gente con daltonismo mirando la tabla).
 */
export function Badge({ campo, valor }: BadgeProps) {
  const { etiqueta, color } = obtenerEtiqueta(campo, valor);
  return <span className={`${styles.badge} ${CLASE_POR_COLOR[color]}`}>{etiqueta}</span>;
}
