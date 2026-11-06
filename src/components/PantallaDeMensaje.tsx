import type { ReactNode } from 'react';
import Link from 'next/link';
import { MarcaInvicta } from './marca/MarcaInvicta';
import styles from './PantallaDeMensaje.module.css';

export interface PantallaDeMensajeProps {
  titulo: string;
  texto: string;
  /** Las salidas, de la principal a la secundaria. Siempre al menos una (`05`, principio 5). */
  acciones: ReactNode;
}

/**
 * Pantalla de mensaje de toda la aplicación: página que no existe y
 * error inesperado (`not-found.tsx`, `error.tsx`, `global-error.tsx`).
 *
 * El 404 era el de Next —"This page could not be found.", en inglés y
 * sin marca— y el error global decía "Algo salió mal" sin ningún botón.
 * A las dos se llega desde un link compartido que quedó viejo, que es
 * justo el visitante cuyo primer segundo más importa (`08`, 10):
 * tienen que decir dónde está, qué pasó en lenguaje de cancha y
 * ofrecer el paso siguiente (`05`, principio 5; `08`, 8).
 *
 * Sin campanita ni "Ingresar": las dos consultan la sesión, y una
 * pantalla de error no debería depender de nada que pueda fallar.
 * Sirve también desde un componente de cliente (`error.tsx`).
 */
export function PantallaDeMensaje({ titulo, texto, acciones }: PantallaDeMensajeProps) {
  return (
    <main className={styles.pagina}>
      <header className={styles.cabecera}>
        <MarcaInvicta conCampana={false} conEnlaceIngresar={false} />
      </header>
      <div className={styles.contenido}>
        <h1 className={`fuente-display ${styles.titulo}`}>{titulo}</h1>
        <p className={styles.texto}>{texto}</p>
        <div className={styles.acciones}>{acciones}</div>
      </div>
    </main>
  );
}

type Variante = 'principal' | 'secundaria';

/** Una salida que lleva a otra pantalla. */
export function EnlaceDeSalida({
  href,
  variante = 'principal',
  children,
}: {
  href: string;
  variante?: Variante;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={styles[variante]}>
      {children}
    </Link>
  );
}

/** Una salida que hace algo ahí mismo (p. ej. reintentar). */
export function BotonDeSalida({
  onClick,
  variante = 'principal',
  children,
}: {
  onClick: () => void;
  variante?: Variante;
  children: ReactNode;
}) {
  return (
    <button type="button" className={styles[variante]} onClick={onClick}>
      {children}
    </button>
  );
}
