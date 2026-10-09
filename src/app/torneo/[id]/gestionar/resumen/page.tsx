import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerResumenParaPublicar } from '@/services/torneos/obtenerResumenParaPublicar';
import { PanelPublicarTorneo } from '@/components/PanelPublicarTorneo';
import { obtenerContextoCacheado, obtenerGestionCacheada } from '../_datos';
import { calcularLoQueEspera } from './_pendientes';
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
 * cómo está el torneo, qué falta y qué hacer ahora. Casi todo se
 * deriva de `obtenerGestionCacheada` — nada nuevo que consultar.
 *
 * En borrador la pantalla **es otra**: lo único que importa es
 * publicar. Esa acción vivía dentro del acordeón "Estado" de
 * Configuración —tres toques desde acá, y en su versión pobre: sin
 * explicar la visibilidad que le quedaba al torneo, sin ofrecer
 * verificar y sin decir qué datos faltaban hasta que el intento
 * fallaba—. Publicar no es un ajuste del torneo; es la decisión que lo
 * pone en el mundo, y va donde se la ve.
 *
 * **Qué contesta la pantalla.** No "¿adónde puedo ir?" sino "¿qué me
 * está esperando?". Tenía tres botones fijos —Gestionar equipos, Ver
 * fixture, Cargar resultados— que eran exactamente los mismos tres
 * destinos de las tres filas de contadores de arriba, y que eran los
 * mismos el primer día del torneo y el último. En su lugar va "Para
 * resolver": lo que está trabado ahora mismo, en orden de urgencia, y
 * la transición de estado que sigue cuando no queda nada trabado. La
 * decisión de qué entra ahí vive en `_pendientes.ts`, con su tabla de
 * casos.
 *
 * Por eso el borrador sale por su propio `return` en vez de ir
 * salpicando condicionales: lo demás de esta pantalla —próximo partido,
 * contadores, las tres acciones— no es que quede feo en borrador, es
 * que miente. "0 / 8 equipos confirmados" cuando todavía no se puede
 * inscribir nadie, y tres botones que llevan a pantallas que responden
 * que primero hay que hacer otra cosa, le compiten a la única acción
 * que sí se puede hacer.
 */
export default async function PaginaResumen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  if (gestion.estado === 'draft') {
    const paraPublicar = await obtenerResumenParaPublicar(
      { torneoId: id },
      await obtenerContextoCacheado(),
    );
    return (
      <div className={styles.pagina}>
        <section className={styles.bloquePublicar}>
          <h2 className={styles.tituloPublicar}>Tu torneo todavía no está publicado</h2>
          <p className={styles.textoPublicar}>
            Mientras siga en borrador no lo ve nadie más que vos: no se puede inscribir ningún
            equipo ni compartir el enlace.
          </p>
          <PanelPublicarTorneo
            torneoId={id}
            organizacionId={paraPublicar.organizacionId}
            soyTitular={paraPublicar.soyTitular}
            organizacionVerificada={paraPublicar.organizacionVerificada}
            limitePublicadosAlcanzado={paraPublicar.limitePublicadosAlcanzado}
            camposFaltantes={paraPublicar.camposFaltantes}
          />
        </section>
      </div>
    );
  }

  const aprobados = gestion.inscripciones.filter((i) => i.estado === 'approved').length;
  const totalPartidos = gestion.partidos.length;
  const programados = gestion.partidos.filter((p) => p.fechaHoraProgramada !== null).length;
  const conResultado = gestion.partidos.filter(
    (p) => p.estado === 'played' || p.estado === 'walkover',
  ).length;
  const cantidadFechas = new Set(gestion.partidos.map((p) => p.numeroFecha)).size;

  const ahora = Date.now();
  const { pendientes, siguiente } = calcularLoQueEspera(gestion, ahora);
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

      <section className={styles.bloqueEspera}>
        <h2 className={styles.tituloEspera}>Para resolver</h2>
        {pendientes.length === 0 && siguiente === null ? (
          <p className={styles.nadaQueResolver}>
            {gestion.estado === 'registration_open'
              ? 'Nada por ahora: el torneo está esperando que se inscriban los equipos.'
              : 'Nada por ahora.'}
          </p>
        ) : (
          <div className={styles.listaEspera}>
            {pendientes.map((pendiente) => (
              <Link key={pendiente.texto} href={pendiente.href} className={styles.filaEspera}>
                <span>{pendiente.texto}</span>
                <IconoFlecha />
              </Link>
            ))}
            {/* La transición de estado va de último y como acción, no
                como pendiente: es lo que destraba el torneo cuando ya no
                queda nada trabado. */}
            {siguiente && (
              <Link href={siguiente.href} className={styles.accionSiguiente}>
                {siguiente.texto}
              </Link>
            )}
          </div>
        )}
      </section>

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
