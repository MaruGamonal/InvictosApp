import type { Metadata } from 'next';
import { FilaPartido, type EstadoPartido } from '@/components/FilaPartido';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerFichaOFallar, obtenerFixtureCacheado } from '../_datos';
import styles from './pagina.module.css';

/** UC-23 — Fixture y resultados (`10`, sección 5): agrupado por fecha, con la fecha vigente destacada. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [ficha, fixture] = await Promise.all([obtenerFichaOFallar(id), obtenerFixtureCacheado(id)]);
  const descripcion =
    fixture?.fechaVigente != null ? `Fecha ${fixture.fechaVigente}` : 'Todavía sin fixture';

  return {
    title: `Fixture — ${ficha.nombre} — INVICTOS`,
    description: descripcion,
    openGraph: { title: ficha.nombre, description: descripcion },
  };
}

function formatearFecha(iso: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function PaginaFixture({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fixture = await obtenerFixtureCacheado(id);

  if (!fixture || fixture.partidos.length === 0) {
    return <EstadoVacio mensaje="Todavía no hay fixture generado para este torneo." />;
  }

  const fechas = new Map<number, typeof fixture.partidos>();
  for (const partido of fixture.partidos) {
    const grupo = fechas.get(partido.numeroFecha) ?? [];
    grupo.push(partido);
    fechas.set(partido.numeroFecha, grupo);
  }

  return (
    <div className={styles.pagina}>
      {[...fechas.entries()]
        .sort(([a], [b]) => a - b)
        .map(([numeroFecha, partidos]) => (
          <section
            key={numeroFecha}
            className={numeroFecha === fixture.fechaVigente ? styles.fechaVigente : styles.fecha}
          >
            <h2 className={styles.tituloFecha}>Fecha {numeroFecha}</h2>
            <div className={styles.listaPartidos}>
              {partidos.map((partido) => (
                <div key={partido.id} className={styles.filaConSede}>
                  <FilaPartido
                    estado={partido.estado as EstadoPartido}
                    equipoLocal={partido.equipoLocal}
                    equipoVisitante={partido.equipoVisitante}
                    golesLocal={partido.golesLocal}
                    golesVisitante={partido.golesVisitante}
                    fechaProgramadaTexto={formatearFecha(partido.fechaHoraProgramada)}
                  />
                  {partido.sedeNombre && <span className={styles.sede}>{partido.sedeNombre}</span>}
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
