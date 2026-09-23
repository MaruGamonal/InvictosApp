import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerOrganizacionActivaCacheada, obtenerPanelCacheado } from '../_datos';
import { BotonCrearTorneo } from '../BotonCrearTorneo';
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
  if (!organizacion) redirect('/organizador/gestionar');

  const panel = await obtenerPanelCacheado(organizacion.organizacionId);

  return (
    <div className={styles.contenidoPagina}>
      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Mis torneos</h2>

        {/* El mismo botón que en Inicio: si la organización no puede
            publicar otro torneo (`06`, D-51), acá tampoco. Un atajo
            que saltea el bloqueo lo vuelve inexistente. */}
        <BotonCrearTorneo bloqueado={panel.limitePublicadosAlcanzado} />
        <TabsTorneosPanel
          activos={panel.activos}
          proximos={panel.proximos}
          finalizados={panel.finalizados}
        />
      </section>
    </div>
  );
}
