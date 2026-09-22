import type { Metadata } from 'next';
import { Fragment } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { TarjetaEquipoResumen } from '@/components/TarjetaEquipoResumen';
import { EstadoVacio } from '@/components/EstadoVacio';
import { NavInferior } from '@/components/NavInferior';
import { CampoBusqueda } from '@/components/descubrimiento/CampoBusqueda';
import { FilaUbicacion } from '@/components/descubrimiento/FilaUbicacion';
import { FiltrosRapidos } from '@/components/descubrimiento/FiltrosRapidos';
import { SelectorDeCiudad } from '@/components/descubrimiento/SelectorDeCiudad';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { conNombreProducto } from '@/lib/nombreProducto';
import { NOMBRE_COOKIE_CIUDAD } from '@/lib/cookiesDescubrimiento';
import { listarCiudadesCacheado } from '../torneos/_datos';
import { elegirCiudadEnEquipos } from '../torneos/_acciones';
import { buscarEquiposCacheado } from './_datos';
import styles from './pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Buscar equipos'),
  description: 'Encontrá equipos de fútbol amateur por nombre.',
};

const MODALIDADES = ['f5', 'f7', 'f8', 'f9', 'f11'] as const;
const CATEGORIAS_GENERO = ['male', 'female', 'mixed'] as const;

interface SearchParams {
  q?: string;
  modalidad?: string;
  categoriaGenero?: string;
  cursor?: string;
}

/**
 * Buscador de equipos — el nav inferior tenía "Buscar" apuntando a
 * Descubrimiento (torneos), duplicando el tab "Torneos" sin agregar
 * nada; lo que faltaba era justamente esto, poder buscar equipos.
 *
 * Misma estructura que `/torneos` —buscador, ubicación, chips,
 * resultados— con los mismos componentes: pasar de una pantalla a la
 * otra tiene que sentirse el mismo sistema de descubrimiento. Cambian
 * el título, el placeholder y las opciones de los chips; no se agregó
 * ningún criterio de filtrado que no existiera.
 *
 * La diferencia con Descubrimiento (D-90) se mantiene: acá la ciudad no
 * es un contexto **obligatorio** —sin elegir ninguna se ven todos los
 * equipos, porque esto es un directorio por nombre— pero cuando ya hay
 * una elegida se respeta, y es la misma cookie, así que elegirla en una
 * pantalla vale para la otra.
 */
export default async function PaginaBuscarEquipos({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parametros = await searchParams;
  const cookieStore = await cookies();
  const ciudadId = cookieStore.get(NOMBRE_COOKIE_CIUDAD)?.value;
  const provincias = await listarCiudadesCacheado();
  const ciudadActual = provincias
    .flatMap((provincia) => provincia.ciudades)
    .find((ciudad) => ciudad.id === ciudadId);

  const resultado = await buscarEquiposCacheado({
    ciudadId: ciudadActual?.id,
    texto: parametros.q?.trim() || undefined,
    modalidad: MODALIDADES.includes(parametros.modalidad as (typeof MODALIDADES)[number])
      ? (parametros.modalidad as (typeof MODALIDADES)[number])
      : undefined,
    categoriaGenero: CATEGORIAS_GENERO.includes(
      parametros.categoriaGenero as (typeof CATEGORIAS_GENERO)[number],
    )
      ? (parametros.categoriaGenero as (typeof CATEGORIAS_GENERO)[number])
      : undefined,
    cursor: parametros.cursor || undefined,
  });

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <h1 className={`fuente-display ${styles.tituloHero}`}>Equipos</h1>
        <CampoBusqueda
          accion="/equipos"
          placeholder="Nombre del equipo"
          etiqueta="Buscar equipo por nombre"
          valorInicial={parametros.q}
          parametrosOcultos={{
            modalidad: parametros.modalidad,
            categoriaGenero: parametros.categoriaGenero,
          }}
        />
      </header>

      <div className={styles.contenido}>
        <FilaUbicacion ciudad={ciudadActual?.nombre ?? null}>
          <SelectorDeCiudad
            provincias={provincias}
            ciudadActualId={ciudadId}
            alElegirCiudad={elegirCiudadEnEquipos}
          />
        </FilaUbicacion>

        <FiltrosRapidos
          accion="/equipos"
          parametrosActuales={{
            q: parametros.q,
            modalidad: parametros.modalidad,
            categoriaGenero: parametros.categoriaGenero,
          }}
          filas={[
            {
              etiqueta: 'Filtrar por modalidad',
              parametros: [
                {
                  nombre: 'modalidad',
                  activo: parametros.modalidad ?? '',
                  opciones: MODALIDADES.map((modalidad) => ({
                    valor: modalidad,
                    etiqueta: obtenerEtiqueta('torneo.modalidad', modalidad).etiqueta,
                  })),
                },
              ],
            },
            {
              etiqueta: 'Filtrar por categoría',
              parametros: [
                {
                  nombre: 'categoriaGenero',
                  activo: parametros.categoriaGenero ?? '',
                  opciones: CATEGORIAS_GENERO.map((categoria) => ({
                    valor: categoria,
                    etiqueta: obtenerEtiqueta('torneo.categoriaGenero', categoria).etiqueta,
                  })),
                },
              ],
            },
          ]}
        />

        {resultado.equipos.length === 0 ? (
          <EstadoVacio mensaje="No encontramos equipos con esos filtros." />
        ) : (
          <div className={styles.lista}>
            {resultado.equipos.map((equipo) => (
              <Fragment key={equipo.id}>
                <TarjetaEquipoResumen
                  id={equipo.id}
                  nombre={equipo.nombre}
                  categoriaGenero={equipo.categoriaGenero}
                  escudoUrl={equipo.escudoUrl}
                  detalle={equipo.ciudad}
                  mostrarFlecha
                />
              </Fragment>
            ))}
          </div>
        )}

        {resultado.cursorSiguiente && (
          <Link
            href={{
              pathname: '/equipos',
              query: { ...parametros, cursor: resultado.cursorSiguiente },
            }}
            className={styles.verMas}
          >
            Ver más equipos →
          </Link>
        )}
      </div>

      <NavInferior activo="equipos" />
    </div>
  );
}
