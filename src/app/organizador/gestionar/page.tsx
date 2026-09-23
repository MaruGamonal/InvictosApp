import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import {
  obtenerMisOrganizacionesCacheadas,
  obtenerOrganizacionActivaCacheada,
  obtenerPanelCacheado,
} from './_datos';
import { BotonCrearTorneo } from './BotonCrearTorneo';
import { ListaMisOrganizaciones } from './ListaMisOrganizaciones';
import { ResumenOrganizacion } from './ResumenOrganizacion';
import { TabsTorneosPanel } from './TabsTorneosPanel';
import { TarjetaTorneoPanel } from './TarjetaTorneoPanel';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Panel de Organizador') };

/**
 * Inicio del panel de Organizador: el centro de operaciones.
 *
 * La organización es la entidad principal, no un rótulo de la
 * cabecera: un torneo siempre nace bajo una, y sin organización no hay
 * torneo posible. La pantalla sigue ese orden —organización activa,
 * su estado, qué se puede hacer, los torneos, las demás
 * organizaciones— para que las cinco preguntas se respondan en el
 * orden en que se hacen.
 *
 * Lo que cambió respecto de la versión anterior:
 *
 * - Los números eran una línea corrida ("0 activos · 1 por comenzar ·
 *   0 finalizados") que hay que leer entera para sacar un dato. Ahora
 *   son tres cifras con su etiqueta, en el resumen de la organización.
 * - "Crear torneo" estaba siempre habilitado aunque la organización no
 *   pudiera publicar otro (`06`, D-51). Ahora dice que está bloqueado
 *   y explica por qué al tocarlo, en vez de dejar completar el
 *   formulario para fallar al final.
 * - El estado de verificación se mezclaba con la cantidad de torneos.
 *   Son preguntas distintas y ahora viven en filas distintas.
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
            primero necesitás crear una.
          </p>
          <Link href="/organizador/gestionar/crear" className={styles.botonCrearOrganizacion}>
            + Crear organización
          </Link>
        </div>
      </div>
    );
  }

  const panel = await obtenerPanelCacheado(organizacion.organizacionId);

  return (
    <div className={styles.contenidoPagina}>
      <ResumenOrganizacion
        organizacionId={panel.organizacionId}
        nombre={panel.nombreOrganizacion}
        logoUrl={panel.logoUrl}
        nivelVerificacion={panel.nivelVerificacion}
        soyTitular={panel.soyTitular}
        limitePublicadosAlcanzado={panel.limitePublicadosAlcanzado}
        torneos={panel.stats.torneos}
        activos={panel.stats.activos}
        equipos={panel.stats.equipos}
      />

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

        <BotonCrearTorneo bloqueado={panel.limitePublicadosAlcanzado} />

        <TabsTorneosPanel
          activos={panel.activos}
          proximos={panel.proximos}
          finalizados={panel.finalizados}
        />
      </section>

      <ListaMisOrganizaciones
        organizaciones={organizaciones}
        organizacionActivaId={organizacion.organizacionId}
      />
    </div>
  );
}
