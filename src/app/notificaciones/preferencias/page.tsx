import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerPreferenciasNotificacion } from '@/services/notificaciones/obtenerPreferenciasNotificacion';
import { conNombreProducto } from '@/lib/nombreProducto';
import { PanelPreferencias } from './PanelPreferencias';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Preferencias de notificación') };

/** UC-47 — Elegir por qué canal llega cada categoría de aviso. */
export default async function PaginaPreferencias() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const preferencias = await obtenerPreferenciasNotificacion(undefined, contexto);

  return (
    <div className={styles.pagina}>
      <Link
        href="/notificaciones"
        className={styles.enlaceVolver}
        aria-label="Volver a notificaciones"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 5-7 7 7 7" />
        </svg>
      </Link>
      <h1 className={`fuente-display ${styles.titulo}`}>Preferencias</h1>
      <p className={styles.subtitulo}>
        Dos canales: dentro de la app y correo. WhatsApp llega en la segunda etapa, solo para
        reprogramaciones.
      </p>
      <PanelPreferencias preferenciasIniciales={preferencias} />
    </div>
  );
}
