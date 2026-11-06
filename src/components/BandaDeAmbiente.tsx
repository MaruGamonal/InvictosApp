import { AVISO_DE_PRUEBAS, esAmbienteDePruebas } from '@/lib/ambiente';
import styles from './BandaDeAmbiente.module.css';

/**
 * La franja que avisa que esto no es el sitio real.
 *
 * **Por qué hace falta.** El ambiente de pruebas es una copia exacta del
 * producto, con el mismo diseño y el mismo dominio salvo por un
 * subdominio. Dos pestañas abiertas se ven idénticas. Sin una marca, lo
 * que pasa tarde o temprano es que alguien carga el resultado de una
 * fecha real en el ambiente de pruebas —y lo pierde cuando se resiembra—
 * o, peor, prueba algo en producción creyendo que está jugando.
 *
 * En producción no se renderiza nada: ni un nodo vacío. El default de
 * `obtenerAmbiente` es producción, así que una variable faltante o mal
 * escrita deja el sitio real como está.
 */
export function BandaDeAmbiente() {
  if (!esAmbienteDePruebas()) return null;

  return (
    <div className={styles.banda} role="status">
      <span className={styles.punto} aria-hidden />
      {AVISO_DE_PRUEBAS}
    </div>
  );
}
