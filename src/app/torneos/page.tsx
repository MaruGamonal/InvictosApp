import type { Metadata } from 'next';
import { Fragment } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { TarjetaTorneoDescubrimiento } from '@/components/TarjetaTorneoDescubrimiento';
import { TarjetaCertamenDescubrimiento } from '@/components/TarjetaCertamenDescubrimiento';
import { ContenedorPublicidad } from '@/components/ContenedorPublicidad';
import { EstadoVacio } from '@/components/EstadoVacio';
import { NavInferior } from '@/components/NavInferior';
import { RegistrarEvento } from '@/components/RegistrarEvento';
import { EVENTOS_ANALITICA } from '@/lib/analitica';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { conNombreProducto } from '@/lib/nombreProducto';
import { VALORES_DURACION_TORNEO, etiquetaDuracionTorneo } from '@/lib/duracionTorneo';
import { NOMBRE_COOKIE_CATEGORIA_GENERO, NOMBRE_COOKIE_CIUDAD } from '@/lib/cookiesDescubrimiento';
import { elegirCiudad } from './_acciones';
import { buscarTorneosCacheado, listarCiudadesCacheado } from './_datos';
import { agruparCertamenesContiguos } from './_agruparCertamenes';
import { SelectorDeCiudad } from '@/components/descubrimiento/SelectorDeCiudad';
import { CampoBusqueda } from '@/components/descubrimiento/CampoBusqueda';
import { BarraDescubrimiento } from '@/components/descubrimiento/BarraDescubrimiento';
import { FiltrosRapidos } from '@/components/descubrimiento/FiltrosRapidos';
import { FiltrosDesplegables } from '@/components/descubrimiento/FiltrosDesplegables';
import { SelectorDeCategoriaGenero } from './SelectorDeCategoriaGenero';
import { MarcaInvicta } from '@/components/marca/MarcaInvicta';
import styles from './pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Descubrí torneos'),
  description: 'Encontrá torneos de fútbol amateur cerca tuyo.',
};

const MODALIDADES = ['f5', 'f7', 'f8', 'f9', 'f11'] as const;
const CATEGORIAS_EDAD = ['open', 'u13', 'u15', 'u17', 'u20', 'veterans_35', 'veterans_45'] as const;
const CATEGORIAS_GENERO = ['male', 'female', 'mixed'] as const;

/** Después de la 3ª tarjeta (`06`, D-63): visible sin dominar el primer vistazo al listado. */
const INDICE_PUBLICIDAD_EN_LISTA = 2;

interface SearchParams {
  q?: string;
  modalidad?: string;
  categoriaEdad?: string;
  abiertas?: string;
  duracion?: string;
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
  const categoriaGeneroCookie = cookieStore.get(NOMBRE_COOKIE_CATEGORIA_GENERO)?.value;
  const categoriaGenero = CATEGORIAS_GENERO.includes(
    categoriaGeneroCookie as (typeof CATEGORIAS_GENERO)[number],
  )
    ? (categoriaGeneroCookie as (typeof CATEGORIAS_GENERO)[number])
    : undefined;

  const provincias = await listarCiudadesCacheado();

  if (!ciudadId) {
    return (
      <div className={styles.pagina}>
        <header className={styles.hero}>
          <MarcaInvicta />
          <h1 className={`fuente-display ${styles.tituloHero}`}>Torneos cerca de vos</h1>
        </header>
        <div className={styles.contenido}>
          <p className={styles.intro}>Elegí tu ciudad para ver los torneos cerca tuyo.</p>
          <SelectorDeCiudad provincias={provincias} alElegirCiudad={elegirCiudad} />
        </div>
        <NavInferior activo="torneos" />
      </div>
    );
  }

  const ciudadActual = provincias
    .flatMap((provincia) => provincia.ciudades.map((ciudad) => ({ ...ciudad, provincia })))
    .find((ciudad) => ciudad.id === ciudadId);

  const duracion = VALORES_DURACION_TORNEO.includes(
    parametros.duracion as (typeof VALORES_DURACION_TORNEO)[number],
  )
    ? (parametros.duracion as (typeof VALORES_DURACION_TORNEO)[number])
    : undefined;

  const resultado = await buscarTorneosCacheado({
    ciudadId,
    texto: parametros.q?.trim() || undefined,
    modalidad: MODALIDADES.includes(parametros.modalidad as (typeof MODALIDADES)[number])
      ? (parametros.modalidad as (typeof MODALIDADES)[number])
      : undefined,
    categoriaEdad: CATEGORIAS_EDAD.includes(
      parametros.categoriaEdad as (typeof CATEGORIAS_EDAD)[number],
    )
      ? (parametros.categoriaEdad as (typeof CATEGORIAS_EDAD)[number])
      : undefined,
    categoriaGenero,
    soloInscripcionesAbiertas: parametros.abiertas === '1',
    duracion,
    cursor: parametros.cursor || undefined,
  });

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <MarcaInvicta acciones={<SelectorDeCategoriaGenero categoriaActual={categoriaGenero} />} />
        <h1 className={`fuente-display ${styles.tituloHero}`}>Torneos cerca de vos</h1>
        <CampoBusqueda
          accion="/torneos"
          placeholder="Nombre del torneo"
          etiqueta="Buscar torneo por nombre"
          valorInicial={parametros.q}
          parametrosOcultos={{
            duracion: parametros.duracion,
            modalidad: parametros.modalidad,
            categoriaEdad: parametros.categoriaEdad,
            abiertas: parametros.abiertas,
          }}
        />
      </header>

      <div className={styles.contenido}>
        <BarraDescubrimiento
          ciudad={ciudadActual?.nombre ?? null}
          filtrosActivos={
            [duracion, parametros.modalidad, parametros.categoriaEdad, parametros.abiertas].filter(
              Boolean,
            ).length
          }
          selectorDeCiudad={
            <SelectorDeCiudad
              provincias={provincias}
              ciudadActualId={ciudadId}
              alElegirCiudad={elegirCiudad}
            />
          }
          filtros={
            <>
              <FiltrosRapidos
                accion="/torneos"
                parametrosActuales={{
                  q: parametros.q,
                  duracion: parametros.duracion,
                  modalidad: parametros.modalidad,
                  categoriaEdad: parametros.categoriaEdad,
                  abiertas: parametros.abiertas,
                }}
                filas={[
                  {
                    etiqueta: 'Filtrar por duración e inscripciones',
                    parametros: [
                      {
                        nombre: 'duracion',
                        activo: duracion ?? '',
                        opciones: VALORES_DURACION_TORNEO.map((valor) => ({
                          valor,
                          etiqueta: etiquetaDuracionTorneo(valor),
                        })),
                      },
                      {
                        nombre: 'abiertas',
                        activo: parametros.abiertas === '1' ? '1' : '',
                        opciones: [{ valor: '1', etiqueta: 'Inscripciones abiertas' }],
                      },
                    ],
                  },
                ]}
              />
              <FiltrosDesplegables
                accion="/torneos"
                parametrosActuales={{
                  q: parametros.q,
                  duracion: parametros.duracion,
                  abiertas: parametros.abiertas,
                }}
                desplegables={[
                  {
                    nombre: 'modalidad',
                    etiqueta: 'Filtrar por modalidad',
                    sinFiltrar: 'Cualquier modalidad',
                    activo: parametros.modalidad ?? '',
                    opciones: MODALIDADES.map((modalidad) => ({
                      valor: modalidad,
                      etiqueta: obtenerEtiqueta('torneo.modalidad', modalidad).etiqueta,
                    })),
                  },
                  {
                    nombre: 'categoriaEdad',
                    etiqueta: 'Filtrar por categoría',
                    sinFiltrar: 'Cualquier categoría',
                    activo: parametros.categoriaEdad ?? '',
                    opciones: CATEGORIAS_EDAD.map((categoria) => ({
                      valor: categoria,
                      etiqueta: obtenerEtiqueta('torneo.categoriaEdad', categoria).etiqueta,
                    })),
                  },
                ]}
              />
            </>
          }
        />

        {resultado.torneos.length === 0 ? (
          <>
            <RegistrarEvento
              evento={EVENTOS_ANALITICA.ciudadSinTorneos}
              propiedades={{
                ciudadId,
                filtrado: Boolean(
                  parametros.q ||
                  parametros.modalidad ||
                  parametros.categoriaEdad ||
                  parametros.abiertas,
                ),
              }}
            />
            <EstadoVacio
              mensaje={
                resultado.sugerenciaProvincia
                  ? `Todavía no hay torneos en ${ciudadActual?.nombre}. La provincia de ${resultado.sugerenciaProvincia.nombre} tiene ${resultado.sugerenciaProvincia.cantidadTorneos} torneo${resultado.sugerenciaProvincia.cantidadTorneos === 1 ? '' : 's'} — tocá la ciudad acá arriba para elegir otra de esa provincia.`
                  : 'No encontramos torneos con esos filtros — probá sacar alguno.'
              }
            />
          </>
        ) : (
          <div className={styles.lista}>
            {agruparCertamenesContiguos(resultado.torneos).map((bloque, indice) => (
              <Fragment
                key={bloque.tipo === 'torneo' ? bloque.torneo.id : bloque.certamenId + indice}
              >
                {bloque.tipo === 'torneo' ? (
                  <Link href={`/torneo/${bloque.torneo.id}`} className={styles.tarjetaEnlace}>
                    <TarjetaTorneoDescubrimiento
                      nombre={bloque.torneo.nombre}
                      imagenUrl={bloque.torneo.imagenUrl}
                      ciudad={ciudadActual?.nombre ?? ''}
                      modalidad={bloque.torneo.modalidad}
                      categoriaGenero={bloque.torneo.categoriaGenero}
                      categoriaEdad={bloque.torneo.categoriaEdad}
                      estado={bloque.torneo.estado}
                      fechaInicioEstimada={bloque.torneo.fechaInicioEstimada}
                      cupoEquipos={bloque.torneo.cupoEquipos}
                      inscriptosAprobados={bloque.torneo.inscriptosAprobados}
                      organizacionNombre={bloque.torneo.organizacionNombre}
                      organizacionVerificada={bloque.torneo.organizacionVerificada}
                    />
                  </Link>
                ) : (
                  <TarjetaCertamenDescubrimiento
                    certamenNombre={bloque.certamenNombre}
                    imagenUrl={bloque.torneos[0]!.imagenUrl}
                    ciudad={ciudadActual?.nombre ?? ''}
                    modalidad={bloque.torneos[0]!.modalidad}
                    categoriaGenero={bloque.torneos[0]!.categoriaGenero}
                    categoriaEdad={bloque.torneos[0]!.categoriaEdad}
                    fechaInicioEstimada={bloque.torneos[0]!.fechaInicioEstimada}
                    organizacionNombre={bloque.torneos[0]!.organizacionNombre}
                    organizacionVerificada={bloque.torneos[0]!.organizacionVerificada}
                    divisiones={bloque.torneos.map((torneo) => ({
                      torneoId: torneo.id,
                      division: torneo.division ?? '',
                      estado: torneo.estado,
                      cupoEquipos: torneo.cupoEquipos,
                      inscriptosAprobados: torneo.inscriptosAprobados,
                    }))}
                  />
                )}
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

      <NavInferior activo="torneos" />
    </div>
  );
}
