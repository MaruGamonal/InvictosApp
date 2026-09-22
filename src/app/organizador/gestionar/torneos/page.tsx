import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerOrganizacionActivaCacheada, obtenerPanelCacheado } from '../_datos';
import { TabsTorneosPanel } from '../TabsTorneosPanel';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Torneos de la organización') };

/**
 * Los torneos que organiza esta organización —los que creó y los de
 * cualquiera que la haya sumado como Administrador—, en su propia
 * sección del nav.
 *
 * Antes vivían dentro de Home, mezclados con las estadísticas y con lo
 * que necesita atención. Pedido en vivo: el nav del panel pasa a ser
 * Inicio · Equipo · Torneos · Perfil, así que los torneos dejan de ser
 * un bloque más de Inicio y tienen su lugar.
 */
export default async function PaginaTorneosDeLaOrganizacion() {
  const organizacion = await obtenerOrganizacionActivaCacheada();
  if (!organizacion) redirect('/organizador/gestionar/crear');

  const panel = await obtenerPanelCacheado(organizacion.organizacionId);

  return (
    <div className={styles.contenidoPagina}>
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
