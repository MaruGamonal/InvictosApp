import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerInicio } from '@/services/inicio/obtenerInicio';
import { obtenerActividad } from '@/services/inicio/obtenerActividad';
import { NavInferior } from '@/components/NavInferior';
import { TarjetaEquipoResumen } from '@/components/TarjetaEquipoResumen';
import { TarjetaTorneoResumen } from '@/components/TarjetaTorneoResumen';
import { TarjetaActividad } from '@/components/TarjetaActividad';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { conNombreProducto } from '@/lib/nombreProducto';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Inicio') };

const FORMATO_FECHA = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface TorneoActivo {
  id: string;
  nombre: string;
  categoriaGenero: string;
  modalidad: string;
  /** Sin la división, dos divisiones del mismo certamen se ven como la misma fila repetida. */
  division: string | null;
  imagenUrl: string | null;
}

interface TorneoConEstado {
  id: string;
  nombre: string;
  categoriaGenero: string;
  modalidad: string;
  division: string | null;
  imagenUrl: string | null;
  estado: string;
}

/** Torneos en curso entre los que juego/administro/sigo — únicos por id, más recientes primero (ya vienen ordenados así). */
function torneosEnCurso(...listas: TorneoConEstado[][]): TorneoActivo[] {
  const porId = new Map<string, TorneoActivo>();
  for (const lista of listas) {
    for (const torneo of lista) {
      if (torneo.estado === 'in_progress' && !porId.has(torneo.id)) {
        porId.set(torneo.id, {
          id: torneo.id,
          nombre: torneo.nombre,
          categoriaGenero: torneo.categoriaGenero,
          modalidad: torneo.modalidad,
          division: torneo.division,
          imagenUrl: torneo.imagenUrl,
        });
      }
    }
  }
  return [...porId.values()];
}

/**
 * Pantalla de Inicio: el feed social del fútbol amateur (evolución
 * sobre el paquete de diseño original `Invictos - Inicio.dc.html`) — "AHORA" y
 * "ACTIVIDAD" son la parte nueva (UC-44, `obtenerActividad.ts`), todo lo
 * demás (próximo partido, mis equipos/torneos) ya existía.
 *
 * "AHORA" sigue la cascada de prioridad del caso de uso (partidos en
 * vivo → torneos activos → actividad reciente) con un matiz real: no
 * existe todavía un estado "en vivo" por partido (`partido.estado` no
 * lo tiene), así que ese primer nivel nunca aplica — no se inventa. El
 * segundo nivel si aplica se muestra acá; si no hay torneos en curso, la
 * sección se omite en vez de repetir el primer item de "ACTIVIDAD"
 * (que ya está inmediatamente debajo — nada queda oculto, solo no se
 * duplica).
 *
 * Reportado en vivo: el redirect de acá abajo (organiza pero no juega →
 * directo al panel de Organizador) volvía inalcanzable el botón "Volver
 * a Inicio" de ese panel — rebotaba para acá y de acá otra vez para
 * allá, sin salida. `?volver=1` (que ese botón manda) lo desactiva: un
 * click explícito en "volver" siempre aterriza acá de verdad.
 */
export default async function PaginaInicio({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string }>;
}) {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const parametros = await searchParams;

  const [inicio, actividad] = await Promise.all([
    obtenerInicio(undefined, contexto),
    obtenerActividad({}, contexto),
  ]);

  // Quien solo organiza (sin plantel propio) ya no tiene nada que ver acá:
  // su Inicio es directamente el panel de Organizador (`/organizador/gestionar`,
  // "Ver como administrador" en el header lo lleva ahí a quien tiene los dos roles).
  if (!parametros.volver && !inicio.esJugador && inicio.esOrganizador) {
    redirect('/organizador/gestionar');
  }

  const activos =
    !inicio.esRecienLlegado && inicio.jugador
      ? torneosEnCurso(
          inicio.jugador.torneos.map((torneo) => ({ ...torneo, id: torneo.torneoId })),
          inicio.jugador.torneosSeguidos,
        )
      : [];

  const bloqueAhoraActividad = (
    <>
      {activos.length > 0 && (
        <section className={styles.seccion}>
          <h2 className={styles.tituloSeccion}>Ahora</h2>
          <div className={styles.lista}>
            {activos.map((torneo) => (
              <TarjetaTorneoResumen
                key={torneo.id}
                torneoId={torneo.id}
                nombre={torneo.nombre}
                categoriaGenero={torneo.categoriaGenero}
                modalidad={torneo.modalidad}
                division={torneo.division}
                imagenUrl={torneo.imagenUrl}
                etiquetaDerecha="En curso"
              />
            ))}
          </div>
        </section>
      )}

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Actividad</h2>
        {actividad.items.length > 0 ? (
          <div className={styles.lista}>
            {actividad.items.map((item) => (
              <TarjetaActividad key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EstadoVacio
            mensaje="Todavía no hay novedades de lo que seguís."
            textoAccion="Descubrir más"
            hrefAccion="/torneos"
          />
        )}
      </section>
    </>
  );

  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        {inicio.ciudadNombre && <div className={styles.ciudad}>{inicio.ciudadNombre}</div>}
        <div className={styles.filaUsuario}>
          <div className={styles.avatar} aria-hidden>
            {inicio.nombreUsuario.trim().charAt(0).toUpperCase() || '?'}
          </div>
          <div className={styles.filaUsuarioTexto}>
            <div className={styles.saludo}>Hola, {inicio.nombreUsuario}</div>
            <div className={`fuente-display ${styles.titulo}`}>
              {inicio.jugador?.equipos[0] ? inicio.jugador.equipos[0].nombre : 'Inicio'}
            </div>
          </div>
          <Link
            href="/notificaciones"
            className={styles.enlaceNotificaciones}
            aria-label="Notificaciones"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
          </Link>
        </div>

        {inicio.esOrganizador && (
          <Link href="/organizador/gestionar" className={styles.selectorModo}>
            Ver como administrador
          </Link>
        )}
      </header>

      <div className={styles.contenido}>
        {inicio.esRecienLlegado && (
          <>
            <div className={styles.bienvenida}>
              <div className={`fuente-display ${styles.bienvenidaTitulo}`}>
                Bienvenida a Invicta
              </div>
              <p className={styles.bienvenidaTexto}>
                Elegí por dónde arrancar. Podés hacer las dos cosas cuando quieras.
              </p>
            </div>
            <Link href="/torneos" className={styles.tarjetaAccion}>
              <div className={styles.tarjetaAccionTitulo}>Descubrir un torneo</div>
              <div className={styles.tarjetaAccionTexto}>
                Buscá por ciudad y modalidad, sin necesidad de tener equipo todavía.
              </div>
            </Link>
            <Link href="/equipo/crear" className={styles.tarjetaAccion}>
              <div className={styles.tarjetaAccionTitulo}>Crear o sumarme a un equipo</div>
              <div className={styles.tarjetaAccionTexto}>
                Armá tu plantel, o esperá la invitación de un capitán.
              </div>
            </Link>
            <Link href="/torneo/crear" className={styles.tarjetaAccionSecundaria}>
              <span>¿Vas a organizar un torneo?</span>
              <span className={styles.tarjetaAccionEnlace}>Empezar ›</span>
            </Link>
          </>
        )}

        {/* Organiza pero no juega, y llegó acá a propósito con "Volver" desde
            el panel de Organizador (si no, `?volver` no está y ya redirigió
            arriba): no hay nada de jugador que mostrar, pero la pantalla
            tiene que decir algo en vez de quedar vacía. */}
        {!inicio.esRecienLlegado && !inicio.jugador && (
          <EstadoVacio
            mensaje="Todavía no formás parte de ningún equipo."
            textoAccion="Crear o sumarme a un equipo"
            hrefAccion="/equipo/crear"
          />
        )}

        {!inicio.esRecienLlegado && inicio.jugador && (
          <>
            {inicio.jugador.proximoPartido ? (
              <section>
                <h2 className={styles.tituloSeccion}>Tu próximo partido</h2>
                <Link
                  href={`/torneo/${inicio.jugador.proximoPartido.torneoId}`}
                  className={styles.tarjetaPartido}
                >
                  <div className={styles.partidoTorneo}>
                    {inicio.jugador.proximoPartido.torneoNombre} · Fecha{' '}
                    {inicio.jugador.proximoPartido.numeroFecha}
                  </div>
                  <div className={styles.partidoEquipos}>
                    <div className={styles.partidoEquipo}>
                      <div className={styles.partidoEscudo}>
                        {inicio.jugador.proximoPartido.miEquipoNombre.charAt(0).toUpperCase()}
                      </div>
                      <span>{inicio.jugador.proximoPartido.miEquipoNombre}</span>
                    </div>
                    <span className={styles.partidoVs}>VS</span>
                    <div className={styles.partidoEquipo}>
                      <div className={styles.partidoEscudo}>
                        {inicio.jugador.proximoPartido.rivalNombre.charAt(0).toUpperCase()}
                      </div>
                      <span>{inicio.jugador.proximoPartido.rivalNombre}</span>
                    </div>
                  </div>
                  <div className={styles.partidoPie}>
                    <span>
                      {FORMATO_FECHA.format(
                        new Date(inicio.jugador.proximoPartido.fechaHoraProgramada),
                      )}
                    </span>
                    {inicio.jugador.proximoPartido.sedeNombre && (
                      <span>{inicio.jugador.proximoPartido.sedeNombre}</span>
                    )}
                  </div>
                </Link>
              </section>
            ) : (
              <div className={styles.pasoSiguiente}>
                <div className={`fuente-display ${styles.pasoSiguienteTitulo}`}>
                  Sin partido programado
                </div>
                <p className={styles.pasoSiguienteTexto}>
                  Mientras tanto, descubrí otro torneo para tu equipo.
                </p>
                <Link href="/torneos" className={styles.pasoSiguienteBoton}>
                  Descubrir torneos
                </Link>
              </div>
            )}

            {bloqueAhoraActividad}

            {inicio.jugador.resultadosPorConfirmar > 0 && (
              <div className={styles.avisoPendiente}>
                {inicio.jugador.resultadosPorConfirmar === 1
                  ? '1 resultado para confirmar o disputar.'
                  : `${inicio.jugador.resultadosPorConfirmar} resultados para confirmar o disputar.`}
              </div>
            )}

            {inicio.jugador.equipos.length > 0 && (
              <section className={styles.seccion}>
                <h2 className={styles.tituloSeccion}>Mis equipos</h2>
                <div className={styles.lista}>
                  {inicio.jugador.equipos.map((equipo) => (
                    <TarjetaEquipoResumen
                      key={equipo.id}
                      id={equipo.id}
                      nombre={equipo.nombre}
                      categoriaGenero={equipo.categoriaGenero}
                      escudoUrl={equipo.escudoUrl}
                      etiquetaDerecha={equipo.rolesEquipo
                        .map((rol) => obtenerEtiqueta('integranteEquipo.rolEquipo', rol).etiqueta)
                        .join(' · ')}
                    />
                  ))}
                </div>
              </section>
            )}

            {inicio.jugador.torneos.length > 0 && (
              <section className={styles.seccion}>
                <h2 className={styles.tituloSeccion}>Mis torneos</h2>
                <div className={styles.lista}>
                  {inicio.jugador.torneos.map((torneo) => (
                    <TarjetaTorneoResumen
                      key={torneo.torneoId}
                      torneoId={torneo.torneoId}
                      nombre={torneo.nombre}
                      categoriaGenero={torneo.categoriaGenero}
                      modalidad={torneo.modalidad}
                      division={torneo.division}
                      imagenUrl={torneo.imagenUrl}
                      miEquipoNombre={torneo.miEquipoNombre}
                      posicionActual={torneo.posicionActual}
                    />
                  ))}
                </div>
              </section>
            )}

            {inicio.jugador.torneosSeguidos.length > 0 && (
              <section className={styles.seccion}>
                <h2 className={styles.tituloSeccion}>Torneos que sigo</h2>
                <div className={styles.lista}>
                  {inicio.jugador.torneosSeguidos.map((torneo) => (
                    <TarjetaTorneoResumen
                      key={torneo.id}
                      torneoId={torneo.id}
                      nombre={torneo.nombre}
                      categoriaGenero={torneo.categoriaGenero}
                      modalidad={torneo.modalidad}
                      division={torneo.division}
                      imagenUrl={torneo.imagenUrl}
                      etiquetaDerecha="Siguiendo"
                    />
                  ))}
                </div>
              </section>
            )}

            {inicio.jugador.equiposSeguidos.length > 0 && (
              <section className={styles.seccion}>
                <h2 className={styles.tituloSeccion}>Equipos que sigo</h2>
                <div className={styles.lista}>
                  {inicio.jugador.equiposSeguidos.map((equipo) => (
                    <TarjetaEquipoResumen
                      key={equipo.id}
                      id={equipo.id}
                      nombre={equipo.nombre}
                      categoriaGenero={equipo.categoriaGenero}
                      escudoUrl={equipo.escudoUrl}
                      etiquetaDerecha="Siguiendo"
                    />
                  ))}
                </div>
              </section>
            )}

            {!inicio.esOrganizador && (
              <Link href="/torneo/crear" className={styles.tarjetaAccionSecundaria}>
                <span>¿Vas a organizar un torneo?</span>
                <span className={styles.tarjetaAccionEnlace}>Empezar ›</span>
              </Link>
            )}
          </>
        )}
      </div>

      <NavInferior activo="inicio" />
    </div>
  );
}
