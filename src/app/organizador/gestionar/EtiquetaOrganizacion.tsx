import { Escudo } from '@/components/Escudo';
import styles from './EtiquetaOrganizacion.module.css';

export interface EtiquetaOrganizacionProps {
  nombre: string;
  logoUrl: string | null;
}

/**
 * Con una sola organización, cuál se está gestionando es un **dato**,
 * no una elección: va al lado del nombre de la persona, en una píldora
 * chica y sin flecha. Ofrecer elegir entre una cosa es prometer una
 * opción que no existe.
 *
 * Con más de una, esto no se muestra: la organización se va a su
 * propio control en la fila de abajo (`SelectorOrganizacionActiva`),
 * y repetirla acá sería decir dos veces lo mismo.
 */
export function EtiquetaOrganizacion({ nombre, logoUrl }: EtiquetaOrganizacionProps) {
  return (
    <p className={styles.unica}>
      <Escudo src={logoUrl} nombre={nombre} tamano={20} />
      <span className={styles.nombre}>{nombre}</span>
    </p>
  );
}
