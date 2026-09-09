import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerInicio } from '@/services/inicio/obtenerInicio';
import { NavInferior } from '@/components/NavInferior';
import { TarjetaEquipoResumen } from '@/components/TarjetaEquipoResumen';
import { TarjetaTorneoResumen } from '@/components/TarjetaTorneoResumen';
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

/**
 * Pantalla de Inicio (paquete de diseño, `Invictos - Inicio.dc.html`).
 * Simplificaciones deliberadas frente al prototipo: el encabezado
 * siempre dice "Hola, {nombre}" sin el título contextual que cambia
 * según el modo (nombre del equipo / de la organización, dato que
 * `obtenerInicio` no trae todavía), y "Cargar resultados" /
 * "Resolver inscripciones" quedan como aviso sin botón — esa gestión de
 * organizador no tiene pantalla propia todavía (la tienen "Crear equipo"
 * y "Crear torneo", que sí se construyeron en esta misma pasada).
 */
export default async function PaginaInicio({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const inicio = await obtenerInicio(undefined, contexto);
  const parametros = await searchParams;

  const mostrarSwitch = inicio.esJugador && inicio.esOrganizador;
  const modo: 'jugador' | 'organizador' =
    parametros.modo === 'organizador' && inicio.esOrganizador
      ? 'organizador'
      : parametros.modo === 'jugador' && inicio.esJugador
        ? 'jugador'
        : inicio.esJugador
          ? 'jugador'
          : 'organizador';

  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        <div className={styles.filaUsuario}>
          <div className={styles.avatar} aria-hidden>
            {inicio.nombreUsuario.trim().charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <div className={styles.saludo}>Hola, {inicio.nombreUsuario}</div>
            <div className={`fuente-display ${styles.titulo}`}>Inicio</div>
          </div>
        </div>

        {mostrarSwitch && (
          <div className={styles.switchModo}>
            <Link
              href="/inicio?modo=jugador"
              className={modo === 'jugador' ? styles.switchOpcionActiva : styles.switchOpcion}
            >
              Jugador
            </Link>
            <Link
              href="/inicio?modo=organizador"
              className={modo === 'organizador' ? styles.switchOpcionActiva : styles.switchOpcion}
            >
              Organizador
            </Link>
          </div>
        )}
      </header>

      <div className={styles.contenido}>
        {inicio.esRecienLlegado && (
          <>
            <div className={styles.bienvenida}>
              <div className={`fuente-display ${styles.bienvenidaTitulo}`}>Bienvenida a Invicta</div>
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

        {!inicio.esRecienLlegado && modo === 'jugador' && inicio.jugador && (
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
                      {FORMATO_FECHA.format(new Date(inicio.jugador.proximoPartido.fechaHoraProgramada))}
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
                      etiquetaDerecha={
                        obtenerEtiqueta('integranteEquipo.rolEquipo', equipo.rolEquipo).etiqueta
                      }
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
                      miEquipoNombre={torneo.miEquipoNombre}
                      posicionActual={torneo.posicionActual}
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
                      etiquetaDerecha="Siguiendo"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {!inicio.esRecienLlegado && modo === 'organizador' && inicio.organizador && (
          <>
            {inicio.organizador.inscripcionesPendientes > 0 && (
              <div className={styles.avisoPendiente}>
                {inicio.organizador.inscripcionesPendientes === 1
                  ? '1 inscripción pendiente de resolver.'
                  : `${inicio.organizador.inscripcionesPendientes} inscripciones pendientes de resolver.`}{' '}
                La gestión de inscripciones todavía no tiene pantalla propia — llega pronto.
              </div>
            )}
            {inicio.organizador.resultadosSinCargar > 0 && (
              <div className={styles.avisoPendiente}>
                {inicio.organizador.resultadosSinCargar === 1
                  ? '1 resultado sin cargar.'
                  : `${inicio.organizador.resultadosSinCargar} resultados sin cargar.`}{' '}
                Cargar resultados todavía no tiene pantalla propia — llega pronto.
              </div>
            )}

            <section className={styles.seccion}>
              <div className={styles.filaTituloSeccion}>
                <h2 className={styles.tituloSeccion}>Mis torneos</h2>
                <Link href="/torneo/crear" className={styles.enlaceCrear}>
                  + Crear torneo
                </Link>
              </div>
              {inicio.organizador.torneosAdministrados.length > 0 ? (
                <div className={styles.lista}>
                  {inicio.organizador.torneosAdministrados.map((torneo) => (
                    <TarjetaTorneoResumen
                      key={torneo.id}
                      torneoId={torneo.id}
                      nombre={torneo.nombre}
                      categoriaGenero={torneo.categoriaGenero}
                      modalidad={torneo.modalidad}
                      estado={torneo.estado}
                      inscriptos={torneo.inscriptos}
                      cupoEquipos={torneo.cupoEquipos}
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.textoVacio}>Todavía no organizaste ningún torneo.</p>
              )}
            </section>

            {inicio.organizador.equiposSeguidos.length > 0 && (
              <section className={styles.seccion}>
                <h2 className={styles.tituloSeccion}>Equipos que sigo</h2>
                <div className={styles.lista}>
                  {inicio.organizador.equiposSeguidos.map((equipo) => (
                    <TarjetaEquipoResumen
                      key={equipo.id}
                      id={equipo.id}
                      nombre={equipo.nombre}
                      categoriaGenero={equipo.categoriaGenero}
                      etiquetaDerecha="Siguiendo"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <NavInferior activo="inicio" />
    </div>
  );
}
