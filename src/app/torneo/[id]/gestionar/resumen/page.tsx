import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerGestionCacheada } from '../_datos';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Resumen del torneo') };

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ESTADOS_SIN_RESULTADO_AUN = new Set(['unscheduled', 'scheduled']);

/**
 * Dashboard del torneo (diseño aprobado "Gestionar torneo" —
 * reemplaza a la pantalla única y larga de antes): de un vistazo,
 * cómo está el torneo, qué falta y qué hacer ahora. Todo se deriva de
 * `obtenerGestionCacheada` — nada nuevo que consultar.
 */
export default async function PaginaResumen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  const aprobados = gestion.inscripciones.filter((i) => i.estado === 'approved').length;
  const totalPartidos = gestion.partidos.length;
  const programados = gestion.partidos.filter((p) => p.fechaHoraProgramada !== null).length;
  const conResultado = gestion.partidos.filter(
    (p) => p.estado === 'played' || p.estado === 'walkover',
  ).length;
  const cantidadFechas = new Set(gestion.partidos.map((p) => p.numeroFecha)).size;

  const ahora = Date.now();
  const proximo = gestion.partidos
    .filter(
      (p) =>
        p.fechaHoraProgramada !== null &&
        ESTADOS_SIN_RESULTADO_AUN.has(p.estado) &&
        new Date(p.fechaHoraProgramada).getTime() >= ahora,
    )
    .sort(
      (a, b) =>
        new Date(a.fechaHoraProgramada!).getTime() - new Date(b.fechaHoraProgramada!).getTime(),
    )[0];

  return (
    <div className={styles.pagina}>
      <p className={styles.subtitulo}>
        {aprobados} equipo{aprobados === 1 ? '' : 's'}
        {totalPartidos > 0 && ` · ${cantidadFechas} fecha${cantidadFechas === 1 ? '' : 's'}`}
      </p>

      {proximo ? (
        <div className={styles.tarjetaProximo}>
          <span className={styles.etiquetaProximo}>Próximo partido</span>
          <div className={styles.filaEquipos}>
            <span>{proximo.equipoLocalNombre}</span>
            <span className={styles.vs}>vs</span>
            <span>{proximo.equipoVisitanteNombre}</span>
          </div>
          <p className={styles.detalleProximo}>
            {formatearFechaHora(proximo.fechaHoraProgramada!)}
            {proximo.sedeNombre && ` · ${proximo.sedeNombre}`}
          </p>
          <Link href={`/torneo/${id}/gestionar/fixture`} className={styles.botonVerPartido}>
            Ver partido
          </Link>
        </div>
      ) : (
        <div className={styles.tarjetaProximo}>
          <span className={styles.etiquetaProximo}>Sin partido programado</span>
          <p className={styles.textoVacio}>Programalo desde Fixture.</p>
        </div>
      )}

      <div className={styles.stats}>
        <Link href={`/torneo/${id}/gestionar/equipos`} className={styles.filaStat}>
          <span className={styles.textoStat}>
            <span className={styles.nombreStat}>Equipos</span>
            <span className={styles.valorStat}>
              {aprobados} / {gestion.cupoEquipos} confirmados
            </span>
          </span>
          <IconoFlecha />
        </Link>
        <Link href={`/torneo/${id}/gestionar/fixture`} className={styles.filaStat}>
          <span className={styles.textoStat}>
            <span className={styles.nombreStat}>Fixture</span>
            <span className={styles.valorStat}>
              {programados} / {totalPartidos} partidos programados
            </span>
          </span>
          <IconoFlecha />
        </Link>
        <Link href={`/torneo/${id}/gestionar/resultados`} className={styles.filaStat}>
          <span className={styles.textoStat}>
            <span className={styles.nombreStat}>Resultados</span>
            <span className={styles.valorStat}>
              {conResultado} / {totalPartidos} cargados
            </span>
          </span>
          <IconoFlecha />
        </Link>
      </div>

      <span className={styles.tituloSeccion}>Acciones</span>
      <div className={styles.acciones}>
        <Link href={`/torneo/${id}/gestionar/equipos`} className={styles.botonAccionSecundaria}>
          Gestionar equipos
        </Link>
        <Link href={`/torneo/${id}/gestionar/fixture`} className={styles.botonAccionSecundaria}>
          Ver fixture
        </Link>
        <Link href={`/torneo/${id}/gestionar/resultados`} className={styles.botonAccionPrimaria}>
          Cargar resultados
        </Link>
      </div>
    </div>
  );
}

function IconoFlecha() {
  return (
    <svg
      className={styles.flechaStat}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
