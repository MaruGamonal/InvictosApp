import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerOrganizacionActivaCacheada, obtenerPanelCacheado } from './_datos';
import { TarjetaTorneoPanel } from './TarjetaTorneoPanel';
import { TabsTorneosPanel } from './TabsTorneosPanel';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Panel de Organizador') };

/**
 * Home del panel de Organizador: stats de un vistazo, lo que necesita
 * atención primero, y el resto agrupado en pestañas — el layout ya
 * resolvió el guard de sesión.
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
          <h2 className={styles.tituloSeccion}>Mis torneos</h2>
          <Link href="/torneo/crear" className={styles.enlaceCrear}>
            + Crear torneo
          </Link>
        </div>
        <TabsTorneosPanel
          activos={panel.activos}
          proximos={panel.proximos}
          finalizados={panel.finalizados}
        />
      </section>
    </div>
  );
}
