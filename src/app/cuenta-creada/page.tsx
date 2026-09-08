import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import styles from './pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Cuenta creada'),
};

/**
 * Paso intermedio entre confirmar el correo y `/torneos`
 * (`Flujo Registro y primer torneo.dc.html`, pantalla 3 — "Cuenta
 * creada"). `auth/callback` llega acá (`?next=/cuenta-creada`) recién
 * cuando el enlace de confirmación ya canjeó el código: a esta altura
 * la cuenta existe de verdad y el correo ya está validado, así que a
 * diferencia del copy del mockup (pensado para una cuenta que funciona
 * *antes* de confirmar el correo) acá no hay nada pendiente que avisar.
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
      <Link href="/torneos" className={styles.boton}>
        Empezar
      </Link>
    </div>
  );
}
