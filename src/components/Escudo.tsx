'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './Escudo.module.css';

export interface EscudoProps {
  /** URL de la imagen. Si falta, se muestra un placeholder digno — nunca un espacio roto. */
  src?: string | null;
  /** Nombre del equipo/torneo/persona, para el placeholder (inicial) y el alt. */
  nombre: string;
  tamano?: number;
}

/**
 * Escudo o avatar con placeholder (`08`, 11.10): un equipo sin escudo
 * cargado nunca muestra un ícono roto — muestra su inicial sobre un
 * fondo neutro oscuro, consistente en todos los listados.
 *
 * **Tampoco si la imagen no carga.** Un escudo que se borró del
 * almacenamiento, un host caído o una conexión mala dejaban el `alt`
 * —el nombre del equipo— desbordado dentro del círculo. Si la imagen
 * falla, se cae a la inicial. La falla puede ocurrir antes de que React
 * se hidrate (la imagen viene en el HTML del servidor), cuando
 * `onError` todavía no está escuchando: por eso al montar se mira
 * además si la que ya terminó de cargar se puede decodificar.
 */
export function Escudo({ src, nombre, tamano = 40 }: EscudoProps) {
  const estilo = { width: tamano, height: tamano, fontSize: tamano * 0.42 };
  const [falloSrc, setFalloSrc] = useState<string | null>(null);
  const imagen = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imagen.current;
    // `decode()` rechaza sólo si la imagen está rota. `naturalWidth === 0`
    // no sirve: un SVG sin tamaño propio también da cero y carga bien.
    if (!img || !src || !img.complete || typeof img.decode !== 'function') return;
    img.decode().catch(() => setFalloSrc(src));
  }, [src]);

  if (src && falloSrc !== src) {
    return (
      <span className={styles.escudo} style={estilo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imagen}
          src={src}
          alt={nombre}
          className={styles.imagen}
          onError={() => setFalloSrc(src)}
        />
      </span>
    );
  }

  return (
    <span className={styles.escudo} style={estilo} aria-label={nombre} role="img">
      {nombre.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
