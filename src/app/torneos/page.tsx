import type { Metadata } from 'next';
import { Fragment } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { TarjetaTorneo } from '@/components/TarjetaTorneo';
import { ContenedorPublicidad } from '@/components/ContenedorPublicidad';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { NOMBRE_COOKIE_CIUDAD } from './_constantes';
import { buscarTorneosCacheado, listarCiudadesCacheado } from './_datos';
import { SelectorDeCiudad } from './SelectorDeCiudad';
import styles from './pagina.module.css';

export const metadata: Metadata = {
  title: 'Descubrí torneos — INVICTOS',
  description: 'Encontrá torneos de fútbol amateur cerca tuyo.',
};

const MODALIDADES = ['f5', 'f7', 'f8', 'f9', 'f11'] as const;
const CATEGORIAS_EDAD = ['open', 'u13', 'u15', 'u17', 'u20', 'veterans_35', 'veterans_45'] as const;

/** Después de la 3ª tarjeta (`06`, D-63): visible sin dominar el primer vistazo al listado. */
const INDICE_PUBLICIDAD_EN_LISTA = 2;

interface SearchParams {
  modalidad?: string;
  categoriaEdad?: string;
  abiertas?: string;
  cursor?: string;
}

/**
 * UC-22 — El descubrimiento: **el activo del producto** (`06`, D-51).
 * La ciudad es el contexto, no un filtro (D-90): esta página la lee de
 * una cookie que `elegirCiudad` (`_acciones.ts`) escribe, y si no hay
 * ninguna, la pide **dentro de la pantalla**, sin bloquear nada (D-04b)
 * — nunca la infiere (D-89).
 *
 * Filtros como querystring de un formulario GET nativo: la URL sola ya
 * describe la búsqueda, sin depender de JavaScript para funcionar.
 */
export default async function PaginaDescubrimiento({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parametros = await searchParams;
  const cookieStore = await cookies();
  const ciudadId = cookieStore.get(NOMBRE_COOKIE_CIUDAD)?.value;

  const provincias = await listarCiudadesCacheado();

  if (!ciudadId) {
    return (
      <div className={styles.pagina}>
        <h1 className="fuente-display">Descubrí torneos</h1>
        <p className={styles.intro}>Elegí tu ciudad para ver los torneos cerca tuyo.</p>
        <SelectorDeCiudad provincias={provincias} />
      </div>
    );
  }

  const ciudadActual = provincias
    .flatMap((provincia) => provincia.ciudades.map((ciudad) => ({ ...ciudad, provincia })))
    .find((ciudad) => ciudad.id === ciudadId);

  const resultado = await buscarTorneosCacheado({
    ciudadId,
    modalidad: MODALIDADES.includes(parametros.modalidad as (typeof MODALIDADES)[number])
      ? (parametros.modalidad as (typeof MODALIDADES)[number])
      : undefined,
    categoriaEdad: CATEGORIAS_EDAD.includes(
      parametros.categoriaEdad as (typeof CATEGORIAS_EDAD)[number],
    )
      ? (parametros.categoriaEdad as (typeof CATEGORIAS_EDAD)[number])
      : undefined,
    soloInscripcionesAbiertas: parametros.abiertas === '1',
    cursor: parametros.cursor || undefined,
  });

  return (
    <div className={styles.pagina}>
      <header className={styles.encabezado}>
        <h1 className="fuente-display">Torneos en {ciudadActual?.nombre ?? 'tu ciudad'}</h1>
        <details className={styles.cambiarCiudad}>
          <summary>Cambiar ciudad</summary>
          <SelectorDeCiudad provincias={provincias} ciudadActualId={ciudadId} />
        </details>
      </header>

      <form method="get" className={styles.filtros}>
        <select name="modalidad" defaultValue={parametros.modalidad ?? ''}>
          <option value="">Cualquier modalidad</option>
          {MODALIDADES.map((modalidad) => (
            <option key={modalidad} value={modalidad}>
              {obtenerEtiqueta('torneo.modalidad', modalidad).etiqueta}
            </option>
          ))}
        </select>
        <select name="categoriaEdad" defaultValue={parametros.categoriaEdad ?? ''}>
          <option value="">Cualquier categoría</option>
          {CATEGORIAS_EDAD.map((categoria) => (
            <option key={categoria} value={categoria}>
              {obtenerEtiqueta('torneo.categoriaEdad', categoria).etiqueta}
            </option>
          ))}
        </select>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            name="abiertas"
            value="1"
            defaultChecked={parametros.abiertas === '1'}
          />
          Solo inscripciones abiertas
        </label>
        <button type="submit" className={styles.botonFiltrar}>
          Filtrar
        </button>
      </form>

      {resultado.torneos.length === 0 ? (
        <EstadoVacio
          mensaje={
            resultado.sugerenciaProvincia
              ? `Todavía no hay torneos en ${ciudadActual?.nombre}. La provincia de ${resultado.sugerenciaProvincia.nombre} tiene ${resultado.sugerenciaProvincia.cantidadTorneos} torneo${resultado.sugerenciaProvincia.cantidadTorneos === 1 ? '' : 's'} — elegí otra ciudad de esa provincia en "Cambiar ciudad".`
              : 'No encontramos torneos con esos filtros.'
          }
        />
      ) : (
        <div className={styles.lista}>
          {resultado.torneos.map((torneo, indice) => (
            <Fragment key={torneo.id}>
              <Link href={`/torneo/${torneo.id}`} className={styles.tarjetaEnlace}>
                <TarjetaTorneo
                  nombre={torneo.nombre}
                  imagenUrl={torneo.imagenUrl}
                  ciudad={ciudadActual?.nombre ?? ''}
                  modalidad={torneo.modalidad}
                  estado={torneo.estado}
                />
              </Link>
              {/* Publicidad (T24, `06` D-63): dentro del listado, en su propio contenedor (D-75) para que nunca se confunda con una tarjeta. */}
              {indice === INDICE_PUBLICIDAD_EN_LISTA && <ContenedorPublicidad />}
            </Fragment>
          ))}
        </div>
      )}

      {resultado.cursorSiguiente && (
        <Link
          href={{
            pathname: '/torneos',
            query: { ...parametros, cursor: resultado.cursorSiguiente },
          }}
          className={styles.verMas}
        >
          Ver más torneos →
        </Link>
      )}
    </div>
  );
}
