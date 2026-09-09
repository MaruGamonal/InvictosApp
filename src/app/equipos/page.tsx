import type { Metadata } from 'next';
import { Fragment } from 'react';
import Link from 'next/link';
import { TarjetaEquipoResumen } from '@/components/TarjetaEquipoResumen';
import { EstadoVacio } from '@/components/EstadoVacio';
import { NavInferior } from '@/components/NavInferior';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { conNombreProducto } from '@/lib/nombreProducto';
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
 * A diferencia de Descubrimiento (D-90), la ciudad acá no es un
 * contexto obligatorio: es un directorio por nombre, no una vista por
 * defecto de "lo mío".
 */
export default async function PaginaBuscarEquipos({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parametros = await searchParams;
  const resultado = await buscarEquiposCacheado({
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
      <h1 className="fuente-display">Equipos</h1>

      <form method="get" className={styles.filtros}>
        <input
          type="search"
          name="q"
          placeholder="Buscar por nombre…"
          defaultValue={parametros.q ?? ''}
          className={styles.busqueda}
        />
        <select name="modalidad" defaultValue={parametros.modalidad ?? ''}>
          <option value="">Cualquier modalidad</option>
          {MODALIDADES.map((modalidad) => (
            <option key={modalidad} value={modalidad}>
              {obtenerEtiqueta('torneo.modalidad', modalidad).etiqueta}
            </option>
          ))}
        </select>
        <select name="categoriaGenero" defaultValue={parametros.categoriaGenero ?? ''}>
          <option value="">Cualquier categoría</option>
          {CATEGORIAS_GENERO.map((categoria) => (
            <option key={categoria} value={categoria}>
              {obtenerEtiqueta('torneo.categoriaGenero', categoria).etiqueta}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.botonFiltrar}>
          Buscar
        </button>
      </form>

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

      <NavInferior activo="equipos" />
    </div>
  );
}
