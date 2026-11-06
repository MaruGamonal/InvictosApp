import type { Metadata } from 'next';
import { Fragment } from 'react';
import Link from 'next/link';
import { FilaPartido, type EstadoPartido } from '@/components/FilaPartido';
import { ContenedorPublicidad } from '@/components/ContenedorPublicidad';
import { EstadoVacio } from '@/components/EstadoVacio';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerFichaOFallar, obtenerFixtureCacheado } from '../../_datos';
import styles from './pagina.module.css';
import { ZONA_HORARIA } from '@/lib/zonaHoraria';

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
    title: conNombreProducto(`Fixture — ${ficha.nombre}`),
    description: descripcion,
    openGraph: { title: ficha.nombre, description: descripcion },
  };
}

/**
 * La fecha original, sólo si el partido se movió. `fecha_hora_original`
 * se escribe la primera vez que se programa —igual a la vigente—, así
 * que "tiene original" no alcanza: tiene que ser distinta.
 */
function fechaOriginalSiSeMovio(partido: {
  fechaHoraProgramada: string | null;
  fechaHoraOriginal: string | null;
}): string | undefined {
  const { fechaHoraProgramada: vigente, fechaHoraOriginal: original } = partido;
  if (!original || !vigente) return undefined;
  if (new Date(original).getTime() === new Date(vigente).getTime()) return undefined;
  return formatearFecha(original);
}

function formatearFecha(iso: string | null): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: ZONA_HORARIA,
    hourCycle: 'h23',
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
    return (
      <EstadoVacio mensaje="Todavía no hay fixture generado para este torneo. Seguilo desde la ficha y te avisamos cuando esté." />
    );
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
                // Cada partido lleva a su detalle: goleadores, quién cargó
                // el resultado y desde cuándo rige (`08`, 11.4). Desde el
                // fixture público no había forma de llegar.
                <Link
                  key={partido.id}
                  href={`/torneo/${id}/partido/${partido.id}`}
                  className={styles.enlacePartido}
                >
                  <FilaPartido
                    estado={partido.estado as EstadoPartido}
                    equipoLocal={partido.equipoLocal}
                    equipoVisitante={partido.equipoVisitante}
                    golesLocal={partido.golesLocal}
                    golesVisitante={partido.golesVisitante}
                    fechaProgramadaTexto={formatearFecha(partido.fechaHoraProgramada)}
                    fechaOriginalTexto={fechaOriginalSiSeMovio(partido)}
                    sedeNombre={partido.sedeNombre}
                    jugadorDelPartido={partido.jugadorDelPartido}
                    conLineaDeDatos
                  />
                </Link>
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
