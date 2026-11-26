import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerPreferenciasNotificacion } from '@/services/notificaciones/obtenerPreferenciasNotificacion';
import { conNombreProducto } from '@/lib/nombreProducto';
import { PanelPreferencias } from './PanelPreferencias';
import styles from './pagina.module.css';
import { CabeceraDeTarea } from '@/components/CabeceraDeTarea';

export const metadata: Metadata = { title: conNombreProducto('Preferencias de notificación') };

/** UC-47 — Elegir por qué canal llega cada categoría de aviso. */
export default async function PaginaPreferencias() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const preferencias = await obtenerPreferenciasNotificacion(undefined, contexto);

  return (
    <main className={styles.pagina}>
      <CabeceraDeTarea volverA="/notificaciones" titulo="Preferencias" />
      <PanelPreferencias preferenciasIniciales={preferencias} />
    </main>
  );
}
