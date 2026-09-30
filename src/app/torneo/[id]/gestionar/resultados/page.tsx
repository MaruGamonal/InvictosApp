import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import { EstadoVacio } from '@/components/EstadoVacio';
import { Badge } from '@/components/Badge';
import { obtenerGestionCacheada } from '../_datos';
import { PanelResultados } from '../PanelResultados';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Resultados del torneo') };

/** UC-31 — Cargar resultados pendientes y ver los ya cargados. */
export default async function PaginaResultados({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  // Pendiente es lo que todavía puede recibir un resultado. Un
  // suspendido sí (se reprograma y se juega); un ganado por
  // presentación o un anulado, no — y antes se quedaban acá, con los
  // campos de goles al lado de un partido que ya estaba resuelto.
  const ESPERAN_RESULTADO = new Set(['unscheduled', 'scheduled', 'postponed']);
  const partidosSinJugar = gestion.partidos.filter((p) => ESPERAN_RESULTADO.has(p.estado));
  const cargados = gestion.partidos.filter(
    (p) => p.estado === 'played' || p.estado === 'walkover' || p.estado === 'cancelled',
  );
  // Arriba de todo: es lo único de esta pantalla que está esperando a
  // alguien. Un resultado objetado no lo confirma el plazo ni el
  // equipo rival (`06`, D-60) — queda quieto hasta que se resuelva.
  const objetados = gestion.partidos.filter((p) => p.estadoResultado === 'disputed');

  if (gestion.partidos.length === 0) {
    return <EstadoVacio mensaje="Todavía no hay partidos generados en el fixture." />;
  }

  return (
    <div className={styles.pagina}>
      {objetados.length > 0 && (
        <div>
          <span className={styles.tituloSeccion}>Objetados</span>
          <div className={styles.lista}>
            {objetados.map((partido) => (
              <Link
                key={partido.id}
                href={`/torneo/${id}/partido/${partido.id}`}
                className={styles.filaObjetado}
              >
                <span className={styles.nombresCargado}>
                  <span className={styles.equipoCargado}>{partido.equipoLocalNombre}</span>
                  <span className={styles.marcadorCargado}>
                    {partido.golesLocal} – {partido.golesVisitante}
                  </span>
                  <span className={styles.equipoCargado}>{partido.equipoVisitanteNombre}</span>
                </span>
                {partido.objecionMotivo && (
                  <span className={styles.motivoObjecion}>{partido.objecionMotivo}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

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
                    {partido.golesLocal ?? '–'} – {partido.golesVisitante ?? '–'}
                  </span>
                  <span className={styles.equipoCargado}>{partido.equipoVisitanteNombre}</span>
                </span>
                {partido.estado !== 'played' && (
                  <Badge campo="partido.estado" valor={partido.estado} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
