'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './BuscadorDireccionTorneo.module.css';

export interface UbicacionSeleccionada {
  direccion: string;
  latitud: number | null;
  longitud: number | null;
}

interface Props {
  id: string;
  value: string;
  onChange: (ubicacion: UbicacionSeleccionada) => void;
}

interface SugerenciaDireccion {
  direccion: string;
  latitud: number;
  longitud: number;
}

const DEMORA_BUSQUEDA_MS = 400;
const LARGO_MINIMO = 3;

/**
 * UC-16 — Dirección del torneo, con autocompletar contra Nominatim
 * (OpenStreetMap, gratis — reemplaza al Google Places Autocomplete
 * original: sin presupuesto para Maps). `direccion` con coordenadas
 * reales solo se completa al elegir una sugerencia de la lista; escribir
 * sin elegir ninguna sigue funcionando como texto libre sin coordenadas
 * — la dirección es opcional y nunca bloquea crear el torneo (D-52).
 */
export function BuscadorDireccionTorneo({ id, value, onChange }: Props) {
  const [texto, setTexto] = useState(value);
  const [abierto, setAbierto] = useState(false);
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([]);
  const [buscando, setBuscando] = useState(false);
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

  useEffect(() => {
    const termino = texto.trim();
    if (termino.length < LARGO_MINIMO) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }

    let cancelado = false;
    setBuscando(true);
    const temporizador = setTimeout(() => {
      fetch(`/api/geocodificacion/buscar?q=${encodeURIComponent(termino)}`)
        .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
        .then((cuerpo) => {
          if (!cancelado) setSugerencias(cuerpo?.data?.resultados ?? []);
        })
        .catch(() => {
          if (!cancelado) setSugerencias([]);
        })
        .finally(() => {
          if (!cancelado) setBuscando(false);
        });
    }, DEMORA_BUSQUEDA_MS);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [texto]);

  function alEscribir(nuevoTexto: string) {
    setTexto(nuevoTexto);
    setAbierto(true);
    onChange({ direccion: nuevoTexto, latitud: null, longitud: null });
  }

  function elegir(sugerencia: SugerenciaDireccion) {
    setTexto(sugerencia.direccion);
    setAbierto(false);
    setSugerencias([]);
    onChange(sugerencia);
  }

  const mostrarPanel = abierto && texto.trim().length >= LARGO_MINIMO;

  return (
    <div className={styles.contenedor} ref={contenedorRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={mostrarPanel}
        aria-controls={idPanel}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="La sede física — distinta de la ciudad"
        value={texto}
        onFocus={() => setAbierto(true)}
        onChange={(evento) => alEscribir(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') setAbierto(false);
        }}
      />
      {mostrarPanel && (
        <div id={idPanel} className={styles.panel} role="listbox">
          {buscando && <p className={styles.estado}>Buscando…</p>}
          {!buscando && sugerencias.length === 0 && (
            <p className={styles.estado}>No encontramos ninguna dirección con ese texto.</p>
          )}
          {sugerencias.map((sugerencia, indice) => (
            <button
              type="button"
              key={`${sugerencia.latitud}-${sugerencia.longitud}-${indice}`}
              role="option"
              aria-selected={false}
              className={styles.opcion}
              onClick={() => elegir(sugerencia)}
            >
              {sugerencia.direccion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
