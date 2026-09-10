'use client';

import { useEffect, useRef, useState } from 'react';

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

let cargaScript: Promise<void> | null = null;

function cargarGoogleMaps(): Promise<void> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Sin NEXT_PUBLIC_GOOGLE_MAPS_API_KEY configurada.'));
  if (window.google?.maps?.places) return Promise.resolve();
  if (!cargaScript) {
    cargaScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'));
      document.head.appendChild(script);
    });
  }
  return cargaScript;
}

/**
 * UC-16 — Dirección del torneo, con autocompletar de Google Places:
 * reportado en vivo, "la ubicación que coloco debe ser una ubicación
 * reconocida por el maps para que pueda direccionar correctamente". Con
 * Places disponible, `direccion` solo se actualiza al elegir una
 * sugerencia real (con sus coordenadas) — escribir sin elegir ninguna no
 * alcanza, a propósito.
 *
 * Sin `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (o si el script no llega a
 * cargar), cae a un input de texto libre igual que antes: la dirección
 * sigue siendo opcional (D-52) y nunca bloquea crear el torneo.
 */
export function BuscadorDireccionTorneo({ id, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(value);
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    let cancelado = false;
    cargarGoogleMaps()
      .then(() => {
        if (cancelado || !inputRef.current || !window.google) return;
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'ar' },
          fields: ['formatted_address', 'geometry'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const ubicacion = place.geometry?.location;
          const direccion = place.formatted_address ?? inputRef.current?.value ?? '';
          setTexto(direccion);
          onChange({
            direccion,
            latitud: ubicacion ? ubicacion.lat() : null,
            longitud: ubicacion ? ubicacion.lng() : null,
          });
        });
        setDisponible(true);
      })
      .catch(() => {
        // Sin key o sin conexión: se queda como input de texto libre.
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alEscribir(nuevoTexto: string) {
    setTexto(nuevoTexto);
    if (!disponible || nuevoTexto === '') {
      onChange({ direccion: nuevoTexto, latitud: null, longitud: null });
    }
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      placeholder="La sede física — distinta de la ciudad"
      value={texto}
      onChange={(evento) => alEscribir(evento.target.value)}
    />
  );
}
