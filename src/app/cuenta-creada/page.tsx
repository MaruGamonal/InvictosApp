import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import styles from './pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Cuenta creada'),
};

/**
 * Paso 3 de Flujo 1 (`FLOWS.md`): confirmación inmediata después de
 * "Registro mínimo", sin esperar a validar el correo — `iniciarRegistro`
 * ya deja la cuenta creada y con sesión abierta en el mismo paso
 * (`src/services/identidad/registrar.ts`). El botón "Empezar" sigue al
 * paso 5 del flujo, Inicio (`/inicio`); pedir la ciudad si hace falta
 * (D-90) ya no es un paso propio de este flujo — se resuelve, como
 * siempre, en el primer uso del descubrimiento (`/torneos`).
 */
export default function PaginaCuentaCreada() {
  return (
    <div className={styles.pagina}>
      <div className={styles.icono}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 13 4.5 4.5L19 7" />
        </svg>
      </div>
      <h1 className={`fuente-display ${styles.titulo}`}>Cuenta creada</h1>
      <p className={styles.texto}>
        Tu cuenta está lista: ya podés seguir equipos y torneos, sumarte a un plantel o publicar el
        tuyo.
      </p>
      <div className={styles.puntos}>
        <span className={styles.puntoActivo} />
        <span className={styles.punto} />
        <span className={styles.punto} />
      </div>
      <Link href="/inicio" className={styles.boton}>
        Empezar
      </Link>
    </div>
  );
}
