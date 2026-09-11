import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import { EstadoVacio } from '@/components/EstadoVacio';
import { CompartirBoton } from '@/components/CompartirBoton';
import { BotonSeguir } from '@/components/BotonSeguir';
import { BotonPedirSumarme } from '@/components/BotonPedirSumarme';
import { EnlaceGestionarEquipo } from '@/components/EnlaceGestionarEquipo';
import { FilaPartido } from '@/components/FilaPartido';
import { NavInferior } from '@/components/NavInferior';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { esErrorDeAplicacion } from '@/lib/errores';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { cachearLecturaDeEquipo } from '@/lib/cache';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerEquipoPublico, type EquipoPublico } from '@/services/equipos/obtenerEquipoPublico';
import { ListaPlantelPublico } from './ListaPlantelPublico';
import styles from './pagina.module.css';

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

/**
 * UC-14/UC-37 — Perfil público del equipo (`10`, sección 5). Cabecera
 * en superficie oscura de identidad, cuerpo en claro (`08`, 6.1).
 * Caché con invalidación por evento: `cargarResultado`, `registrarNoDisputado`
 * y `darDeBajaDelTorneo` (T15/T16/T17) ya invalidan `equipo:<id>` desde
 * T21 — acá solo hacía falta el lado de lectura.
 */

async function obtenerEquipoCacheado(equipoId: string): Promise<EquipoPublico | null> {
  try {
    // La caché de datos de Next es persistente entre deploys (no expira
    // por versión de código): cada vez que cambia el shape de lo que
    // devuelve `obtenerEquipoPublico`, una entrada vieja puede servirle a
    // código nuevo un objeto con forma distinta a la esperada — pasó una
    // vez con `rolEquipo` → `rolesEquipo` (reportado en vivo, confirmado
    // por Sentry) y tiró abajo la página. Por eso la clave lleva versión:
    // 'v3' sumó `proximoPartido`/`ultimoResultado`; 'v4' reemplazó
    // `scoreEstado` fijo por `score` real; 'v5' sumó `torneoModalidad`/
    // `torneoCategoriaGenero`/`posicion` a cada fila de `historial`
    // (sección "Torneos en juego"). Si el shape vuelve a cambiar, esto
    // hay que volver a bumpearlo.
    return await cachearLecturaDeEquipo('equipo-publico-v5', equipoId, () =>
      obtenerEquipoPublico({ equipoId }, CONTEXTO_PUBLICO),
    )();
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'NO_ENCONTRADO') return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const equipo = await obtenerEquipoCacheado(id);
  if (!equipo) return {};
  const descripcion = equipo.ciudad?.nombre ?? 'Perfil público del equipo';

  return {
    title: conNombreProducto(equipo.nombre),
    description: descripcion,
    openGraph: {
      title: equipo.nombre,
      description: descripcion,
      images: equipo.escudoUrl ? [{ url: equipo.escudoUrl }] : undefined,
    },
  };
}

export default async function PaginaEquipoPublico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const equipo = await obtenerEquipoCacheado(id);
  if (!equipo) notFound();
  const urlDelSitio = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <div className={styles.heroContenido}>
          <Escudo src={equipo.escudoUrl} nombre={equipo.nombre} tamano={64} />
          <div className={styles.heroTexto}>
            <h1 className={`${styles.nombre} fuente-display`}>{equipo.nombre}</h1>
            <div className={styles.meta}>
              <span className={styles.pillMeta}>
                {obtenerEtiqueta('torneo.categoriaGenero', equipo.categoriaGenero).etiqueta}
                {equipo.ciudad && ` · ${equipo.ciudad.nombre}`}
              </span>
              {equipo.modalidadHabitual && (
                <span className={styles.pillMeta}>
                  {obtenerEtiqueta('torneo.modalidad', equipo.modalidadHabitual).etiqueta}
                </span>
              )}
            </div>
          </div>
        </div>

        {/*
          D-04b: visible sin sesión, el registro se pide recién al accionar
          (las dos redirigen a /ingresar sin sesión). Compartir es
          funcional: no necesita cuenta ni confirmación.
        */}
        <div className={styles.accionesHero}>
          <BotonSeguir tipoSeguido="team" entidadId={id} />
          <BotonPedirSumarme equipoId={id} />
          <CompartirBoton titulo={equipo.nombre} url={`${urlDelSitio}/equipo/${id}`} />
        </div>
        <p className={styles.avisoHero}>
          Seguir es al toque. Sumarte al plantel necesita que el capitán lo confirme.
        </p>
        {/*
          A diferencia de accionesHero (siempre visibles, D-04b), este
          enlace solo tiene sentido para quien tiene vínculo con el
          equipo — se resuelve del lado del cliente, con la sesión real.
        */}
        <EnlaceGestionarEquipo equipoId={id} />
      </header>

      <main className={styles.contenido}>
        <section className={styles.seccionScore}>
          <span className={styles.etiquetaScore}>Score deportivo</span>
          {equipo.score ? (
            <div className={styles.filaScorePrincipal}>
              <span className={styles.valorScore}>{equipo.score.valor}</span>
              <span className={styles.subtituloScore}>
                Sobre {equipo.score.partidosComputados} partidos confirmados en los últimos{' '}
                {equipo.score.desglose.ventanaMeses} meses.
              </span>
            </div>
          ) : (
            <span className={styles.sinScore}>Sin score todavía</span>
          )}
          <Link href={`/equipo/${id}/ranking`} className={styles.enlaceRanking}>
            Ver ranking →
          </Link>
        </section>

        {(equipo.proximoPartido || equipo.ultimoResultado) && (
          <div className={styles.filaResumen}>
            {equipo.proximoPartido && (
              <section>
                <h2 className={styles.tituloSeccion}>Próximo partido</h2>
                <Link
                  href={`/torneo/${equipo.proximoPartido.torneoId}`}
                  className={styles.tarjetaPartido}
                >
                  <FilaPartido
                    estado="scheduled"
                    equipoLocal={
                      equipo.proximoPartido.esLocal
                        ? { nombre: equipo.nombre, escudoUrl: equipo.escudoUrl }
                        : {
                            nombre: equipo.proximoPartido.rivalNombre,
                            escudoUrl: equipo.proximoPartido.rivalEscudoUrl,
                          }
                    }
                    equipoVisitante={
                      equipo.proximoPartido.esLocal
                        ? {
                            nombre: equipo.proximoPartido.rivalNombre,
                            escudoUrl: equipo.proximoPartido.rivalEscudoUrl,
                          }
                        : { nombre: equipo.nombre, escudoUrl: equipo.escudoUrl }
                    }
                    fechaProgramadaTexto={formatearFecha(equipo.proximoPartido.fechaHoraProgramada)}
                  />
                  <span className={styles.metaPartido}>
                    {equipo.proximoPartido.torneoNombre} · Fecha {equipo.proximoPartido.numeroFecha}
                    {equipo.proximoPartido.sedeNombre && ` · ${equipo.proximoPartido.sedeNombre}`}
                  </span>
                </Link>
              </section>
            )}

            {equipo.ultimoResultado && (
              <section>
                <h2 className={styles.tituloSeccion}>Último resultado</h2>
                <Link
                  href={`/torneo/${equipo.ultimoResultado.torneoId}`}
                  className={styles.tarjetaPartido}
                >
                  <FilaPartido
                    estado={equipo.ultimoResultado.estado}
                    equipoLocal={
                      equipo.ultimoResultado.esLocal
                        ? { nombre: equipo.nombre, escudoUrl: equipo.escudoUrl }
                        : {
                            nombre: equipo.ultimoResultado.rivalNombre,
                            escudoUrl: equipo.ultimoResultado.rivalEscudoUrl,
                          }
                    }
                    equipoVisitante={
                      equipo.ultimoResultado.esLocal
                        ? {
                            nombre: equipo.ultimoResultado.rivalNombre,
                            escudoUrl: equipo.ultimoResultado.rivalEscudoUrl,
                          }
                        : { nombre: equipo.nombre, escudoUrl: equipo.escudoUrl }
                    }
                    golesLocal={
                      equipo.ultimoResultado.esLocal
                        ? equipo.ultimoResultado.golesPropios
                        : equipo.ultimoResultado.golesRival
                    }
                    golesVisitante={
                      equipo.ultimoResultado.esLocal
                        ? equipo.ultimoResultado.golesRival
                        : equipo.ultimoResultado.golesPropios
                    }
                  />
                  {(() => {
                    const { golesPropios, golesRival } = equipo.ultimoResultado;
                    const resultado =
                      golesPropios > golesRival
                        ? { texto: 'Ganado', clase: styles.badgeResultadoGanado }
                        : golesPropios < golesRival
                          ? { texto: 'Perdido', clase: styles.badgeResultadoPerdido }
                          : { texto: 'Empatado', clase: styles.badgeResultadoEmpatado };
                    return (
                      <span className={`${styles.badgeResultado} ${resultado.clase}`}>
                        {resultado.texto}
                      </span>
                    );
                  })()}
                  <span className={styles.metaPartido}>{equipo.ultimoResultado.torneoNombre}</span>
                </Link>
              </section>
            )}
          </div>
        )}

        {equipo.historial.some((t) => t.torneoEstado === 'in_progress') && (
          <section>
            <h2 className={styles.tituloSeccion}>Torneos en juego</h2>
            <div className={styles.listaTorneosEnJuego}>
              {equipo.historial
                .filter((t) => t.torneoEstado === 'in_progress')
                .map((torneo) => (
                  <Link
                    key={torneo.torneoId}
                    href={`/torneo/${torneo.torneoId}`}
                    className={styles.filaTorneoEnJuego}
                  >
                    <div>
                      <div className={styles.filaTorneoEnJuegoNombre}>{torneo.torneoNombre}</div>
                      <div className={styles.filaTorneoEnJuegoSubtitulo}>
                        {obtenerEtiqueta('torneo.modalidad', torneo.torneoModalidad).etiqueta} ·{' '}
                        {
                          obtenerEtiqueta('torneo.categoriaGenero', torneo.torneoCategoriaGenero)
                            .etiqueta
                        }
                      </div>
                    </div>
                    {torneo.posicion !== null && (
                      <span className={styles.filaTorneoEnJuegoPosicion}>{torneo.posicion}°</span>
                    )}
                  </Link>
                ))}
            </div>
          </section>
        )}

        <section>
          <h2 className={styles.tituloSeccion}>Plantel</h2>
          {equipo.plantel.length === 0 ? (
            <EstadoVacio mensaje="Este equipo todavía no cargó su plantel." />
          ) : (
            <ListaPlantelPublico equipoId={id} integrantes={equipo.plantel} mostrarRoles />
          )}
        </section>

        {equipo.cuerpoTecnico.length > 0 && (
          <section>
            <h2 className={styles.tituloSeccion}>Cuerpo técnico</h2>
            <ListaPlantelPublico
              equipoId={id}
              integrantes={equipo.cuerpoTecnico}
              mostrarRoles={false}
            />
          </section>
        )}

        <section>
          <h2 className={styles.tituloSeccion}>Historial</h2>
          {equipo.historial.length === 0 ? (
            <EstadoVacio mensaje="Este equipo todavía no jugó ningún torneo." />
          ) : (
            <div className={styles.listaHistorial}>
              {equipo.historial.map((torneo) => (
                <Link
                  key={torneo.torneoId}
                  href={`/torneo/${torneo.torneoId}`}
                  className={styles.filaHistorial}
                >
                  <div className={styles.filaHistorialCabecera}>
                    <span className={styles.nombreTorneo}>{torneo.torneoNombre}</span>
                    <Badge campo="torneo.estado" valor={torneo.torneoEstado} />
                  </div>
                  <div className={styles.filaHistorialDatos}>
                    <span>PJ {torneo.partidosJugados}</span>
                    <span>G {torneo.ganados}</span>
                    <span>E {torneo.empatados}</span>
                    <span>P {torneo.perdidos}</span>
                    <span>
                      GF-GC {torneo.golesFavor}-{torneo.golesContra}
                    </span>
                    <span className={styles.puntosHistorial}>
                      {torneo.puntos + torneo.ajustePuntos} pts
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <NavInferior activo="torneos" />
    </div>
  );
}
