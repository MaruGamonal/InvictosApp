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
 *
 * El `motivo` que llega por query se muestra al pie. No es para la
 * persona, que ya tiene arriba la explicación en sus términos: es para
 * quien tenga que arreglarlo. "Vencido o ya usado" y "el navegador
 * perdió el dato que abre el enlace" se ven idénticos desde esta
 * pantalla, se arreglan de formas distintas, y sin el código la única
 * manera de distinguirlos es adivinar.
 */
export default async function PaginaErrorDeAcceso({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;

  return (
    <div className={styles.pagina}>
      <h1 className="fuente-display">El enlace no funcionó</h1>
      <p className={styles.texto}>
        Puede haber vencido o ya haberse usado. Pedí uno nuevo para entrar.
      </p>
      <Link href="/ingresar" className={styles.enlace}>
        Volver a ingresar
      </Link>
      {motivo ? <p className={styles.motivo}>Código del error: {motivo}</p> : null}
    </div>
  );
}
