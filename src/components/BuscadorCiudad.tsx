'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import styles from './BuscadorCiudad.module.css';

/**
 * Mismo shape que `ProvinciaListada` (`@/services/descubrimiento/listarCiudades`),
 * declarado acá en vez de importado: un componente de `src/components/`
 * no puede depender de `src/services/` (`boundaries/dependencies`).
 */
export interface ProvinciaConCiudades {
  id: string;
  nombre: string;
  ciudades: Array<{ id: string; nombre: string; cantidadTorneos?: number }>;
}

export interface BuscadorCiudadProps {
  id?: string;
  provincias: ProvinciaConCiudades[];
  value: string;
  onChange: (ciudadId: string) => void;
  required?: boolean;
  placeholder?: string;
}

interface CiudadConProvincia {
  id: string;
  nombre: string;
  provinciaNombre: string;
}

/**
 * Selector de ciudad con buscador — el catálogo nacional (D-88) tiene
 * demasiadas ciudades para un `<select>` nativo agrupado por provincia:
 * hay que escrolear a ciegas para encontrar la propia. Es un combobox
 * simple (no una librería): un input de texto que abre un panel con las
 * coincidencias, agrupadas por provincia igual que el selector de
 * `/torneos` — pero pensado para un formulario controlado (guarda un
 * `ciudadId`), no para la Server Action de elegir ciudad de descubrimiento.
 */
export function BuscadorCiudad({
  id,
  provincias,
  value,
  onChange,
  required,
  placeholder,
}: BuscadorCiudadProps) {
  const todasLasCiudades = useMemo<CiudadConProvincia[]>(
    () =>
      provincias.flatMap((provincia) =>
        provincia.ciudades.map((ciudad) => ({
          id: ciudad.id,
          nombre: ciudad.nombre,
          provinciaNombre: provincia.nombre,
        })),
      ),
    [provincias],
  );
  const seleccionada = todasLasCiudades.find((ciudad) => ciudad.id === value) ?? null;

  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const contenedorRef = useRef<HTMLDivElement>(null);
  const idPanel = useId();

  useEffect(() => {
    function alClickearFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', alClickearFuera);
    return () => document.removeEventListener('mousedown', alClickearFuera);
  }, []);

  const termino = busqueda.trim().toLowerCase();
  const coincidencias = termino
    ? todasLasCiudades.filter((ciudad) => ciudad.nombre.toLowerCase().includes(termino))
    : todasLasCiudades;

  const agrupadas = useMemo(() => {
    const porProvincia = new Map<string, CiudadConProvincia[]>();
    for (const ciudad of coincidencias) {
      const lista = porProvincia.get(ciudad.provinciaNombre) ?? [];
      lista.push(ciudad);
      porProvincia.set(ciudad.provinciaNombre, lista);
    }
    return Array.from(porProvincia.entries());
  }, [coincidencias]);

  function elegir(ciudad: CiudadConProvincia) {
    onChange(ciudad.id);
    setBusqueda('');
    setAbierto(false);
  }

  return (
    <div className={styles.contenedor} ref={contenedorRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        placeholder={placeholder ?? 'Buscar ciudad…'}
        value={abierto ? busqueda : (seleccionada?.nombre ?? '')}
        style={!abierto && value ? { paddingRight: 40 } : undefined}
        onFocus={() => {
          setAbierto(true);
          setBusqueda('');
        }}
        onChange={(evento) => setBusqueda(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') setAbierto(false);
        }}
      />
      {!abierto && value && (
        <button
          type="button"
          className={styles.limpiar}
          aria-label="Quitar ciudad elegida"
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
      {abierto && (
        <div id={idPanel} className={styles.panel} role="listbox">
          {agrupadas.length === 0 && (
            <p className={styles.sinResultados}>No encontramos ninguna ciudad con ese nombre.</p>
          )}
          {agrupadas.map(([provinciaNombre, ciudades]) => (
            <div key={provinciaNombre} className={styles.grupo}>
              <span className={styles.provincia}>{provinciaNombre}</span>
              {ciudades.map((ciudad) => (
                <button
                  type="button"
                  key={ciudad.id}
                  role="option"
                  aria-selected={ciudad.id === value}
                  className={ciudad.id === value ? styles.opcionActiva : styles.opcion}
                  onClick={() => elegir(ciudad)}
                >
                  {ciudad.nombre}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
