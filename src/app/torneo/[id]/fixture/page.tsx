import type { Metadata } from 'next';
import { Fragment } from 'react';
import { FilaPartido, type EstadoPartido } from '@/components/FilaPartido';
import { ContenedorPublicidad } from '@/components/ContenedorPublicidad';
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
  const descripcion = fixture?.fechaVigente
    ? `Fecha ${fixture.fechaVigente.numeroFecha}`
    : 'Todavía sin fixture';

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

  // `numero_fecha` vuelve a empezar en cada fase (`groups_knockout`: la
  // llave de eliminación directa arranca en 1, sin importar en qué fecha
  // terminó la liga) — agrupar solo por número mezclaría fases distintas
  // bajo un mismo título "Fecha 1". La clave es fase + número.
  type GrupoFecha = {
    faseId: string;
    faseNombre: string;
    numeroFecha: number;
    partidos: typeof fixture.partidos;
  };
  const grupos: GrupoFecha[] = [];
  const indicePorClave = new Map<string, number>();
  for (const partido of fixture.partidos) {
    const clave = `${partido.faseId}:${partido.numeroFecha}`;
    const indiceExistente = indicePorClave.get(clave);
    if (indiceExistente !== undefined) {
      grupos[indiceExistente]!.partidos.push(partido);
    } else {
      indicePorClave.set(clave, grupos.length);
      grupos.push({
        faseId: partido.faseId,
        faseNombre: partido.faseNombre,
        numeroFecha: partido.numeroFecha,
        partidos: [partido],
      });
    }
  }
  const hayVariasFases = new Set(fixture.partidos.map((p) => p.faseId)).size > 1;

  return (
    <div className={styles.pagina}>
      {grupos.map((grupo, indice) => (
        <Fragment key={`${grupo.faseId}:${grupo.numeroFecha}`}>
          <section
            className={
              grupo.faseId === fixture.fechaVigente?.faseId &&
              grupo.numeroFecha === fixture.fechaVigente?.numeroFecha
                ? styles.fechaVigente
                : styles.fecha
            }
          >
            <h2 className={styles.tituloFecha}>
              {hayVariasFases
                ? `${grupo.faseNombre} · Fecha ${grupo.numeroFecha}`
                : `Fecha ${grupo.numeroFecha}`}
            </h2>
            <div className={styles.listaPartidos}>
              {grupo.partidos.map((partido) => (
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
          {/* Publicidad (T24, `06` D-63): una de las tres superficies habilitadas, tras la primera fecha. */}
          {indice === 0 && <ContenedorPublicidad />}
        </Fragment>
      ))}
    </div>
  );
}
