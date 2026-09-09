import type { Metadata } from 'next';
import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { ContenedorPublicidad } from '@/components/ContenedorPublicidad';
import { CompartirBoton } from '@/components/CompartirBoton';
import { BotonSeguir } from '@/components/BotonSeguir';
import { BotonInscribirEquipo } from '@/components/BotonInscribirEquipo';
import { RegistrarEvento } from '@/components/RegistrarEvento';
import { NavInferior } from '@/components/NavInferior';
import { EVENTOS_ANALITICA } from '@/lib/analitica';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerFichaOFallar, obtenerReglamentosCacheados } from './_datos';
import styles from './pagina.module.css';

/**
 * UC-23 — La ficha del torneo (`10`, sección 5): **la ruta más
 * importante del producto**, la que se pega en un chat (`11`, T21). El
 * contenido cambia según el estado (`02`, UC-23): con inscripciones
 * abiertas destaca la inscripción; en curso, la próxima fecha y la
 * tabla; finalizado, el campeón. Sin ningún pedido de registro — las
 * acciones que lo necesitan (seguir, inscribirse) quedan **visibles**
 * para cualquiera (`06`, D-04b); ambas piden cuenta recién al tocarlas
 * (manda a `/ingresar` sin sesión). `BotonInscribirEquipo` resuelve, ya
 * con la sesión real, a cuál de los equipos propios (Capitana/Delegada)
 * inscribir y si hace falta aceptar el reglamento vigente.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ficha = await obtenerFichaOFallar(id);
  const modalidad = obtenerEtiqueta('torneo.modalidad', ficha.modalidad).etiqueta;
  const descripcion = `${modalidad} · ${ficha.ciudad.nombre} · ${obtenerEtiqueta('torneo.estado', ficha.estado).etiqueta}`;

  return {
    title: conNombreProducto(ficha.nombre),
    description: descripcion,
    openGraph: {
      title: ficha.nombre,
      description: descripcion,
      images: ficha.imagenUrl ? [{ url: ficha.imagenUrl }] : undefined,
    },
  };
}

function formatearFecha(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function PaginaFichaTorneo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await obtenerFichaOFallar(id);
  const urlDelSitio = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const reglamentos =
    ficha.estado === 'registration_open' ? await obtenerReglamentosCacheados(id) : null;
  const reglamentoVigente = reglamentos?.find((r) => r.estado === 'current') ?? null;

  return (
    <div className={styles.pagina}>
      <RegistrarEvento
        evento={EVENTOS_ANALITICA.fichaTorneoVista}
        propiedades={{ torneoId: id, estado: ficha.estado }}
      />

      {/*
        D-04b: visible sin sesión, el registro se pide recién al accionar.
        Seguir e Inscribir a mi equipo piden cuenta al tocar (redirigen a
        /ingresar sin sesión). Compartir es funcional: no necesita cuenta
        ni confirmación.
      */}
      <div className={styles.accionesHero}>
        <BotonSeguir tipoSeguido="tournament" entidadId={id} />
        {ficha.estado === 'registration_open' && (
          <BotonInscribirEquipo torneoId={id} reglamentoVigente={reglamentoVigente} />
        )}
        <CompartirBoton titulo={ficha.nombre} url={`${urlDelSitio}/torneo/${id}`} />
      </div>

      {ficha.direccion && (
        <p className={styles.direccion}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {ficha.direccion}
        </p>
      )}

      {ficha.descripcion && <p className={styles.descripcion}>{ficha.descripcion}</p>}

      {ficha.estado === 'registration_open' && (
        <section className={styles.destacado}>
          <h2 className={styles.tituloSeccion}>Inscripciones abiertas</h2>
          <p>
            {ficha.equiposAprobados} de {ficha.cupoEquipos} equipos confirmados.
          </p>
        </section>
      )}

      {ficha.estado === 'in_progress' && ficha.proximoPartido && (
        <section className={styles.destacado}>
          <h2 className={styles.tituloSeccion}>Próxima fecha</h2>
          <div className={styles.proximoPartido}>
            <span className={styles.equipoProximo}>
              <Escudo
                src={ficha.proximoPartido.equipoLocal.escudoUrl}
                nombre={ficha.proximoPartido.equipoLocal.nombre}
                tamano={28}
              />
              {ficha.proximoPartido.equipoLocal.nombre}
            </span>
            <span>vs</span>
            <span className={styles.equipoProximo}>
              <Escudo
                src={ficha.proximoPartido.equipoVisitante.escudoUrl}
                nombre={ficha.proximoPartido.equipoVisitante.nombre}
                tamano={28}
              />
              {ficha.proximoPartido.equipoVisitante.nombre}
            </span>
          </div>
          {formatearFecha(ficha.proximoPartido.fechaHoraProgramada) && (
            <p className={styles.fechaProxima}>
              {formatearFecha(ficha.proximoPartido.fechaHoraProgramada)}
            </p>
          )}
          <Link href={`/torneo/${id}/tabla`} className={styles.enlaceSecundario}>
            Ver tabla de posiciones →
          </Link>
        </section>
      )}

      {ficha.estado === 'finished' && ficha.campeon && (
        <section className={styles.destacado}>
          <h2 className={styles.tituloSeccion}>Campeón</h2>
          <div className={styles.campeon}>
            <Escudo src={ficha.campeon.escudoUrl} nombre={ficha.campeon.nombre} tamano={40} />
            <span className={styles.nombreCampeon}>{ficha.campeon.nombre}</span>
          </div>
        </section>
      )}

      <dl className={styles.datos}>
        <div>
          <dt>Modalidad</dt>
          <dd>{obtenerEtiqueta('torneo.modalidad', ficha.modalidad).etiqueta}</dd>
        </div>
        <div>
          <dt>Categoría</dt>
          <dd>{obtenerEtiqueta('torneo.categoriaEdad', ficha.categoriaEdad).etiqueta}</dd>
        </div>
        <div>
          <dt>Organiza</dt>
          <dd>{ficha.organizacion.nombre}</dd>
        </div>
      </dl>

      {ficha.equiposInscriptos.length > 0 && (
        <section>
          <div className={styles.tituloConCantidad}>
            <h2 className={styles.tituloSeccion}>Equipos inscriptos</h2>
            <span className={styles.cantidad}>{ficha.equiposInscriptos.length}</span>
          </div>
          <ul className={styles.listaEquiposInscriptos}>
            {ficha.equiposInscriptos.map((equipo) => (
              <li key={equipo.id}>
                <Link href={`/equipo/${equipo.id}`} className={styles.filaEquipoInscripto}>
                  <Escudo src={equipo.escudoUrl} nombre={equipo.nombre} tamano={30} />
                  <span>{equipo.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Publicidad (T24, `06` D-63): una de las tres superficies habilitadas. */}
      <ContenedorPublicidad />

      <p className={styles.aviso}>
        Toda esta ficha es visible sin cuenta. El registro se pide recién al tocar
        &quot;Seguir&quot; o &quot;Inscribir mi equipo&quot;.
      </p>

      <NavInferior activo="torneos" />
    </div>
  );
}
