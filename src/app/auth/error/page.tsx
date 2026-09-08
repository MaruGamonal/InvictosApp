import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import styles from './pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('No pudimos verificar el enlace'),
};

/**
 * Destino de `src/app/auth/callback` cuando el intercambio del código
 * falla (enlace vencido o ya usado) — antes de esta página, ese redirect
 * caía en un 404.
 */
export default function PaginaErrorDeAcceso() {
  return (
    <div className={styles.pagina}>
      <h1 className="fuente-display">El enlace no funcionó</h1>
      <p className={styles.texto}>
        Puede haber vencido o ya haberse usado. Pedí uno nuevo para entrar.
      </p>
      <Link href="/ingresar" className={styles.enlace}>
        Volver a ingresar
      </Link>
    </div>
  );
}
