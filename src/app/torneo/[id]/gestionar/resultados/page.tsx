import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerGestionCacheada } from '../_datos';
import { PanelResultados } from '../PanelResultados';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Resultados del torneo') };

/** UC-31 — Cargar resultados pendientes y ver los ya cargados. */
export default async function PaginaResultados({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  const partidosSinJugar = gestion.partidos.filter((p) => p.estado !== 'played');
  const cargados = gestion.partidos.filter(
    (p) => p.estado === 'played' || p.estado === 'walkover',
  );

  if (gestion.partidos.length === 0) {
    return <EstadoVacio mensaje="Todavía no hay partidos generados en el fixture." />;
  }

  return (
    <div className={styles.pagina}>
      {gestion.estado === 'in_progress' ? (
        <div>
          <span className={styles.tituloSeccion}>Pendientes</span>
          <PanelResultados
            partidos={partidosSinJugar}
            elegiblesPorEquipo={gestion.elegiblesPorEquipo}
          />
        </div>
      ) : (
        <p className={styles.avisoEstado}>
          El torneo tiene que estar en curso para cargar resultados.
        </p>
      )}

      {cargados.length > 0 && (
        <div>
          <div className={styles.filaTituloSeccion}>
            <span className={styles.tituloSeccion}>Cargados</span>
            <Link href={`/torneo/${id}/tabla`} className={styles.enlaceTabla}>
              Ver tabla
            </Link>
          </div>
          <div className={styles.lista}>
            {cargados.map((partido) => (
              <div key={partido.id} className={styles.filaCargado}>
                <span className={styles.nombresCargado}>
                  <span className={styles.equipoCargado}>{partido.equipoLocalNombre}</span>
                  <span className={styles.marcadorCargado}>
                    {partido.golesLocal} – {partido.golesVisitante}
                  </span>
                  <span className={styles.equipoCargado}>{partido.equipoVisitanteNombre}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
