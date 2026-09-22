import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerOrganizacionActivaCacheada, obtenerPanelCacheado } from './_datos';
import { TarjetaTorneoPanel } from './TarjetaTorneoPanel';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Panel de Organizador') };

/**
 * Inicio del panel de Organizador: las estadísticas de un vistazo y lo
 * que necesita atención primero — el layout ya resolvió el guard de
 * sesión.
 *
 * El listado completo de torneos se mudó a su propia sección del nav
 * (`/organizador/gestionar/torneos`): acá quedaba compitiendo con lo
 * urgente, que es lo único que esta pantalla tiene que responder.
 */
export default async function PaginaHomeOrganizador() {
  const organizacion = await obtenerOrganizacionActivaCacheada();
  if (!organizacion) redirect('/organizador/gestionar/crear');

  const panel = await obtenerPanelCacheado(organizacion.organizacionId);

  return (
    <div className={styles.contenidoPagina}>
      <p className={styles.stats}>
        {panel.stats.activos} activos · {panel.stats.porComenzar} por comenzar ·{' '}
        {panel.stats.finalizados} finalizados
      </p>

      {panel.necesitanAtencion.length > 0 && (
        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Necesita atención</h2>
          <div className={styles.lista}>
            {panel.necesitanAtencion.map((torneo) => (
              <TarjetaTorneoPanel key={torneo.id} torneo={torneo} />
            ))}
          </div>
        </section>
      )}

      <section className={styles.seccion}>
        <div className={styles.filaTituloSeccion}>
          <h2 className={styles.tituloSeccion}>Torneos</h2>
          <Link href="/organizador/gestionar/torneos" className={styles.enlaceCrear}>
            Ver todos →
          </Link>
        </div>
        <Link href="/torneo/crear" className={styles.botonCrearTorneo}>
          + Crear torneo
        </Link>
      </section>
    </div>
  );
}
