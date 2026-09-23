import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import {
  obtenerMisOrganizacionesCacheadas,
  obtenerOrganizacionActivaCacheada,
  obtenerPanelCacheado,
} from './_datos';
import { ListaMisOrganizaciones } from './ListaMisOrganizaciones';
import { TarjetaTorneoPanel } from './TarjetaTorneoPanel';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Panel de Organizador') };

/**
 * Inicio del panel de Organizador.
 *
 * Antes redirigía a "Crear organización" cuando no había ninguna, y
 * asumía una sola cuando sí la había. `miembro_organizacion` admite
 * varias desde el esquema inicial, así que quien tuviera dos veía una y
 * no tenía cómo llegar a la otra.
 *
 * Ahora esta pantalla es el lugar donde viven las organizaciones: sin
 * ninguna, explica que hace falta una para crear torneos y ofrece
 * crearla —sin echar a nadie a otra pantalla—; con una o varias, las
 * lista, dice cuál se está gestionando y deja cambiar.
 *
 * El listado completo de torneos vive en su propia sección del nav; acá
 * queda lo que necesita atención, que es lo que esta pantalla responde.
 */
export default async function PaginaInicioOrganizador() {
  const [organizacion, organizaciones] = await Promise.all([
    obtenerOrganizacionActivaCacheada(),
    obtenerMisOrganizacionesCacheadas(),
  ]);

  if (!organizacion) {
    return (
      <div className={styles.contenidoPagina}>
        <div className={styles.vacio}>
          <h2 className={styles.vacioTitulo}>Todavía no tenés una organización</h2>
          <p className={styles.vacioTexto}>
            Los torneos los organiza una organización, no una persona. Para crear tu primer torneo
            necesitás crear una.
          </p>
          <Link href="/organizador/gestionar/crear" className={styles.botonCrearTorneo}>
            Crear organización
          </Link>
        </div>
      </div>
    );
  }

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

      <ListaMisOrganizaciones
        organizaciones={organizaciones}
        organizacionActivaId={organizacion.organizacionId}
      />
    </div>
  );
}
