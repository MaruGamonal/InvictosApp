'use client';

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { normalizarParaBuscar } from '@/lib/normalizarParaBuscar';
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
 *
 * **Teclado: el patrón combobox de ARIA (APG), con el foco siempre en el
 * input.** Las opciones no son botones ni entran en el orden de Tab: la
 * activa se marca con `aria-activedescendant` y se recorre con las
 * flechas. Antes cada ciudad era un `<button>`, así que salir del campo
 * con Tab era recorrer el catálogo entero —274 paradas, y crece—, y la
 * lista quedaba abierta tapando el campo siguiente, porque sólo se
 * cerraba con un clic afuera.
 *
 * - Flecha abajo / arriba: abre y mueve la opción activa (da la vuelta).
 * - Enter: elige la activa; si no hay activa pero sí coincidencias,
 *   elige la primera. Con la lista abierta no envía el formulario.
 * - Escape: cierra sin cambiar nada. Tab o tocar afuera: cierra.
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
  /** Índice en `coincidencias` de la opción activa; -1 si ninguna. */
  const [activa, setActiva] = useState(-1);
  const base = useId();
  const idPanel = `${base}-panel`;
  const idOpcion = (ciudadId: string) => `${base}-opcion-${ciudadId}`;

  const termino = normalizarParaBuscar(busqueda);
  const coincidencias = useMemo(
    () =>
      termino
        ? todasLasCiudades.filter((ciudad) => normalizarParaBuscar(ciudad.nombre).includes(termino))
        : todasLasCiudades,
    [termino, todasLasCiudades],
  );

  // Agrupadas por provincia, conservando el índice plano de cada ciudad
  // para que flechas y `aria-activedescendant` hablen del mismo orden
  // que se ve.
  const agrupadas = useMemo(() => {
    const porProvincia = new Map<string, Array<CiudadConProvincia & { indice: number }>>();
    coincidencias.forEach((ciudad, indice) => {
      const lista = porProvincia.get(ciudad.provinciaNombre) ?? [];
      lista.push({ ...ciudad, indice });
      porProvincia.set(ciudad.provinciaNombre, lista);
    });
    return Array.from(porProvincia.entries());
  }, [coincidencias]);

  const ciudadActiva = abierto && activa >= 0 ? coincidencias[activa] : undefined;
  const idActiva = ciudadActiva ? idOpcion(ciudadActiva.id) : undefined;

  // La activa siempre a la vista dentro del panel, también al recorrer
  // con flechas más allá de lo que entra.
  useEffect(() => {
    if (idActiva) document.getElementById(idActiva)?.scrollIntoView?.({ block: 'nearest' });
  }, [idActiva]);

  function abrir() {
    setAbierto(true);
    setBusqueda('');
    setActiva(-1);
  }

  function cerrar() {
    setAbierto(false);
    setBusqueda('');
    setActiva(-1);
  }

  function elegir(ciudad: CiudadConProvincia) {
    onChange(ciudad.id);
    cerrar();
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        evento.preventDefault();
        if (!abierto) {
          abrir();
          return;
        }
        if (coincidencias.length === 0) return;
        const paso = evento.key === 'ArrowDown' ? 1 : -1;
        setActiva((actual) => {
          if (actual === -1) return paso === 1 ? 0 : coincidencias.length - 1;
          return (actual + paso + coincidencias.length) % coincidencias.length;
        });
        return;
      }
      case 'Enter': {
        if (!abierto) return;
        // Con la lista abierta, Enter es elegir — nunca enviar el
        // formulario a medio completar.
        evento.preventDefault();
        const elegida = ciudadActiva ?? (termino ? coincidencias[0] : undefined);
        if (elegida) elegir(elegida);
        return;
      }
      case 'Escape': {
        if (abierto) {
          evento.preventDefault();
          cerrar();
        }
        return;
      }
    }
  }

  const anuncio = !abierto
    ? ''
    : coincidencias.length === 0
      ? 'No hay ciudades con ese nombre.'
      : termino
        ? `${coincidencias.length} ${coincidencias.length === 1 ? 'ciudad' : 'ciudades'}. Usá las flechas para elegir.`
        : '';

  return (
    <div className={styles.contenedor}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-autocomplete="list"
        aria-activedescendant={idActiva}
        autoComplete="off"
        required={required}
        placeholder={placeholder ?? 'Buscar ciudad…'}
        value={abierto ? busqueda : (seleccionada?.nombre ?? '')}
        style={!abierto && value ? { paddingRight: 40 } : undefined}
        onFocus={abrir}
        // Tab, tocar afuera o cualquier otra salida del campo cierra la
        // lista. Tocar una opción no llega acá: el panel cancela el
        // `mousedown` para que el input no pierda el foco.
        onBlur={cerrar}
        onClick={() => {
          if (!abierto) abrir();
        }}
        onChange={(evento) => {
          setBusqueda(evento.target.value);
          setActiva(-1);
          if (!abierto) setAbierto(true);
        }}
        onKeyDown={alPresionarTecla}
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
      <span className={styles.anuncio} role="status" aria-live="polite">
        {anuncio}
      </span>
      {abierto && (
        <div
          id={idPanel}
          className={styles.panel}
          role="listbox"
          aria-label="Ciudades"
          // Chrome hace enfocable con Tab a todo contenedor con scroll:
          // sin esto, Tab desde el campo caía en el panel, el blur lo
          // cerraba y el foco terminaba en <body>, en vez del campo
          // siguiente.
          tabIndex={-1}
          onMouseDown={(evento) => evento.preventDefault()}
        >
          {agrupadas.length === 0 && (
            <p className={styles.sinResultados}>No encontramos ninguna ciudad con ese nombre.</p>
          )}
          {agrupadas.map(([provinciaNombre, ciudades], indiceGrupo) => {
            const idGrupo = `${base}-provincia-${indiceGrupo}`;
            return (
              <div
                key={provinciaNombre}
                className={styles.grupo}
                role="group"
                aria-labelledby={idGrupo}
              >
                <span id={idGrupo} className={styles.provincia}>
                  {provinciaNombre}
                </span>
                {ciudades.map((ciudad) => {
                  const clases = [
                    ciudad.id === value ? styles.opcionActiva : styles.opcion,
                    ciudad.indice === activa ? styles.opcionEnFoco : '',
                  ].join(' ');
                  return (
                    <div
                      key={ciudad.id}
                      id={idOpcion(ciudad.id)}
                      role="option"
                      aria-selected={ciudad.id === value}
                      className={clases}
                      onMouseEnter={() => setActiva(ciudad.indice)}
                      onClick={() => elegir(ciudad)}
                    >
                      {ciudad.nombre}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
