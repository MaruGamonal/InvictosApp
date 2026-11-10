import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerPartido } from '@/services/competencia/obtenerPartido';
import { esErrorDeAplicacion } from '@/lib/errores';
import { conNombreProducto } from '@/lib/nombreProducto';
import { Marcador } from '@/components/Marcador';
import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import { PanelResponderResultado } from './PanelResponderResultado';
import { PanelAlineacion } from './PanelAlineacion';
import { PanelCargarResultado } from './PanelCargarResultado';
import styles from './pagina.module.css';
import { ZONA_HORARIA } from '@/lib/zonaHoraria';

export const metadata: Metadata = { title: conNombreProducto('Partido') };

const FORMATO_FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: ZONA_HORARIA,
  hourCycle: 'h23',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * T29 — La pantalla de un partido.
 *
 * Es la primera del producto: hasta acá había fixture, tabla y ficha,
 * pero ningún lugar donde pararse frente a **un** partido. Por eso las
 * notificaciones de origen `partido` no tenían a dónde llevar, y el
 * aviso de Inicio tampoco.
 *
 * Pública como el fixture del que sale. Sin sesión se ve el partido y
 * su resultado; los botones aparecen sólo para quien corresponde, y lo
 * que decide eso es el servidor, no esta pantalla.
 */
export default async function PaginaPartido({
  params,
}: {
  params: Promise<{ id: string; partidoId: string }>;
}) {
  const { id, partidoId } = await params;
  const contexto = await construirContexto();

  let partido;
  try {
    partido = await obtenerPartido({ partidoId }, contexto);
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'NO_ENCONTRADO') notFound();
    throw error;
  }
  // Un partido alcanzado desde el id de otro torneo no es este partido.
  if (partido.torneoId !== id) notFound();

  const hayResultado = partido.golesLocal !== null && partido.golesVisitante !== null;
  // `fecha_hora_original` se escribe la primera vez que se programa,
  // igual a la vigente: sólo se movió si son distintas (`06`, D-30).
  const seMovio =
    partido.fechaHoraOriginal !== null &&
    partido.fechaHoraProgramada !== null &&
    new Date(partido.fechaHoraOriginal).getTime() !==
      new Date(partido.fechaHoraProgramada).getTime();
  const equipoQueObjeto =
    partido.objecionAbierta?.equipoId === partido.local.id ? partido.local : partido.visitante;

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <div className={styles.heroContenido}>
          <Link href={`/torneo/${id}/fixture`} className={styles.enlaceVolver}>
            ← {partido.torneoNombre}
          </Link>
          <span className={styles.fecha}>Fecha {partido.numeroFecha}</span>
        </div>
      </header>

      <main className={styles.contenido}>
        <h1 className={styles.soloLector}>
          {partido.local.nombre} contra {partido.visitante.nombre}
        </h1>
        {/* El estado del partido, con su etiqueta del catálogo (`08`,
            11.4: "estado del resultado"). No lo decía en ningún lado. */}
        <div className={styles.estado}>
          <Badge campo="partido.estado" valor={partido.estado} />
        </div>
        {hayResultado ? (
          <Marcador
            nombreLocal={partido.local.nombre}
            nombreVisitante={partido.visitante.nombre}
            golesLocal={partido.golesLocal!}
            golesVisitante={partido.golesVisitante!}
          />
        ) : (
          <div className={styles.sinResultado}>
            <div className={styles.equipo}>
              <Escudo src={partido.local.escudoUrl} nombre={partido.local.nombre} tamano={48} />
              <span className={styles.nombreEquipo}>{partido.local.nombre}</span>
            </div>
            <span className={styles.versus}>vs</span>
            <div className={styles.equipo}>
              <Escudo
                src={partido.visitante.escudoUrl}
                nombre={partido.visitante.nombre}
                tamano={48}
              />
              <span className={styles.nombreEquipo}>{partido.visitante.nombre}</span>
            </div>
          </div>
        )}

        <dl className={styles.datos}>
          {/* "Cuándo" va siempre: sin fecha también es una respuesta.
              Antes, un partido sin programar mostraba los dos equipos y
              nada más. */}
          <div className={styles.dato}>
            <dt>Cuándo</dt>
            <dd>
              {partido.fechaHoraProgramada
                ? FORMATO_FECHA.format(new Date(partido.fechaHoraProgramada))
                : 'Sin fecha todavía'}
            </dd>
          </div>
          {seMovio && (
            <div className={styles.dato}>
              <dt>Antes era</dt>
              <dd className={styles.fechaOriginal}>
                {FORMATO_FECHA.format(new Date(partido.fechaHoraOriginal!))}
              </dd>
            </div>
          )}
          {partido.sedeNombre && (
            <div className={styles.dato}>
              <dt>Dónde</dt>
              <dd>{partido.sedeNombre}</dd>
            </div>
          )}
          {partido.cargadoPor && (
            <div className={styles.dato}>
              <dt>Cargó el resultado</dt>
              <dd>{partido.cargadoPor}</dd>
            </div>
          )}
        </dl>

        {partido.objecionAbierta && (
          <section className={styles.objecion}>
            <h2 className={styles.tituloObjecion}>Objetado por {equipoQueObjeto.nombre}</h2>
            <blockquote className={styles.motivo}>{partido.objecionAbierta.motivo}</blockquote>
          </section>
        )}

        {partido.puedeCargarResultado && (
          <PanelCargarResultado
            partidoId={partido.id}
            version={partido.version}
            localNombre={partido.local.nombre}
            visitanteNombre={partido.visitante.nombre}
          />
        )}

        {hayResultado && (
          <PanelAlineacion
            partidoId={partido.id}
            version={partido.version}
            golesLocal={partido.golesLocal!}
            golesVisitante={partido.golesVisitante!}
            local={partido.local}
            visitante={partido.visitante}
            alineacion={partido.alineacion}
            habilitados={partido.habilitados}
            puedeCargar={partido.puedeCargarAlineacion}
          />
        )}

        <PanelResponderResultado
          partidoId={partido.id}
          torneoId={id}
          estadoResultado={partido.estadoResultado}
          puedeResponder={partido.puedeResponder}
          puedeResolverObjecion={partido.puedeResolverObjecion}
          confirmaSoloEl={partido.confirmaSoloEl}
        />
      </main>
    </div>
  );
}
