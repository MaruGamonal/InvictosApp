import Link from 'next/link';
import { SECCIONES_CONFIGURACION, type SeccionConfiguracion } from './_secciones';
import styles from './pagina.module.css';

export interface CabeceraDeSeccionProps {
  torneoId: string;
  seccion: SeccionConfiguracion;
}

/**
 * El encabezado de una sección de Configuración: la vuelta al menú y el
 * título.
 *
 * La vuelta explícita existe porque el botón de atrás del navegador no
 * es una salida visible —en una aplicación instalada no hay barra de
 * navegación— y porque el `‹` del hero de gestión vuelve a la ficha
 * pública del torneo, no al menú. Sin esto, entrar a una sección sería
 * entrar a un callejón.
 */
export function CabeceraDeSeccion({ torneoId, seccion }: CabeceraDeSeccionProps) {
  return (
    <div className={styles.cabeceraSeccion}>
      <Link href={`/torneo/${torneoId}/gestionar/configuracion`} className={styles.volverAlMenu}>
        ‹ Configuración
      </Link>
      <h2 className={styles.tituloDeSeccion}>{SECCIONES_CONFIGURACION[seccion]}</h2>
    </div>
  );
}
