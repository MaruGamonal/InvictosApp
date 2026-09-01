import type { Metadata } from 'next';
import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { obtenerFichaOFallar } from './_datos';
import styles from './pagina.module.css';

/**
 * UC-23 — La ficha del torneo (`10`, sección 5): **la ruta más
 * importante del producto**, la que se pega en un chat (`11`, T21). El
 * contenido cambia según el estado (`02`, UC-23): con inscripciones
 * abiertas destaca la inscripción; en curso, la próxima fecha y la
 * tabla; finalizado, el campeón. Sin ningún pedido de registro — las
 * acciones que lo necesitan (seguir, inscribirse) quedan **visibles**
 * para cualquiera (`06`, D-04b); el flujo completo de esas dos acciones
 * (el modal de registro en el momento del clic) es la única pieza de
 * UI que este ticket no termina de cablear — la lectura pública sin
 * sesión, que es lo que no admite "después lo mejoramos", sí está
 * completa.
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
    title: `${ficha.nombre} — INVICTOS`,
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

  return (
    <div className={styles.pagina}>
      {ficha.estado === 'registration_open' && (
        <section className={styles.destacado}>
          <h2 className={styles.tituloSeccion}>Inscripciones abiertas</h2>
          <p>
            {ficha.equiposAprobados} de {ficha.cupoEquipos} equipos confirmados.
          </p>
          {/*
            D-04b: visible sin sesión, el registro se pide recién al accionar.
            Todavía sin el flujo de clic (pedir cuenta y completar la
            solicitud) — eso es UI cliente que no construye este ticket;
            por eso es un botón inerte y no un link a una ruta que no existe.
          */}
          <button type="button" className={styles.cta}>
            Inscribir a mi equipo
          </button>
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

      {ficha.descripcion && <p className={styles.descripcion}>{ficha.descripcion}</p>}

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

      {/* Mismo criterio que el botón de inscripción: visible, todavía sin el flujo de clic (D-04b). */}
      <button type="button" className={styles.enlaceSecundario}>
        Seguir este torneo
      </button>
    </div>
  );
}
