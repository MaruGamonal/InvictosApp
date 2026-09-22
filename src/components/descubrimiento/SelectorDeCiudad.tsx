'use client';

import { useMemo, useState } from 'react';
import styles from './SelectorDeCiudad.module.css';

/**
 * Mismo shape que `ProvinciaListada` (`@/services/descubrimiento/listarCiudades`),
 * declarado acá en vez de importado: un componente de `src/components/`
 * no puede depender de `src/services/` (`boundaries/dependencies`).
 * Mismo criterio que `BuscadorCiudad`.
 */
export interface ProvinciaConCiudadesYTorneos {
  id: string;
  nombre: string;
  ciudades: Array<{ id: string; nombre: string; cantidadTorneos: number }>;
}

export interface SelectorDeCiudadProps {
  provincias: ProvinciaConCiudadesYTorneos[];
  ciudadActualId?: string;
  /**
   * Server Action que guarda la ciudad. Llega por prop y no se importa
   * acá porque `/torneos` y `/equipos` vuelven cada una a su pantalla:
   * antes el selector redirigía siempre a `/torneos`, que al compartirlo
   * habría sacado de Equipos a quien solo quería cambiar de ciudad.
   */
  alElegirCiudad: (ciudadId: string) => Promise<void>;
}

/**
 * UC-22 — Selector de ciudad (`06`, D-88): búsqueda por nombre,
 * agrupado en dos niveles —provincia → ciudad—, con la provincia
 * siempre visible y las ciudades con torneos ya ordenadas primero por
 * `listarCiudades` (el filtrado de acá es solo por texto, nunca
 * reordena). Cada ciudad es un botón que dispara `elegirCiudad`, la
 * Server Action que guarda la cookie y vuelve a `/torneos` (`_acciones.ts`).
 */
export function SelectorDeCiudad({
  provincias,
  ciudadActualId,
  alElegirCiudad,
}: SelectorDeCiudadProps) {
  const [busqueda, setBusqueda] = useState('');

  const provinciasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return provincias;
    return provincias
      .map((provincia) => ({
        ...provincia,
        ciudades: provincia.ciudades.filter((ciudad) =>
          ciudad.nombre.toLowerCase().includes(termino),
        ),
      }))
      .filter((provincia) => provincia.ciudades.length > 0);
  }, [provincias, busqueda]);

  return (
    <div className={styles.selector}>
      <input
        type="search"
        placeholder="Buscar ciudad…"
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        className={styles.busqueda}
        aria-label="Buscar ciudad"
      />
      <form className={styles.listado}>
        {provinciasFiltradas.length === 0 && (
          <p className={styles.sinResultados}>No encontramos ninguna ciudad con ese nombre.</p>
        )}
        {provinciasFiltradas.map((provincia) => (
          <div key={provincia.id} className={styles.grupoProvincia}>
            <span className={styles.nombreProvincia}>{provincia.nombre}</span>
            <div className={styles.ciudades}>
              {provincia.ciudades.map((ciudad) => (
                <button
                  key={ciudad.id}
                  type="submit"
                  formAction={alElegirCiudad.bind(null, ciudad.id)}
                  className={
                    ciudad.id === ciudadActualId
                      ? `${styles.ciudad} ${styles.ciudadActual}`
                      : styles.ciudad
                  }
                >
                  {ciudad.nombre}
                  {ciudad.cantidadTorneos > 0 && (
                    <span className={styles.cantidad}>{ciudad.cantidadTorneos}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </form>
    </div>
  );
}
