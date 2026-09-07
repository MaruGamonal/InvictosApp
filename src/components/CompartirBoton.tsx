'use client';

import { useState } from 'react';
import styles from './CompartirBoton.module.css';

export interface CompartirBotonProps {
  titulo: string;
  url: string;
}

/**
 * Botón de compartir (`08` — ficha del torneo y perfil de equipo, junto
 * a Seguir): usa el Web Share API nativo cuando existe y cae a copiar
 * el link al portapapeles si no. Es la única acción social de estas
 * fichas que no necesita el modal de registro que D-04b dejó
 * pendiente — no hay nada que confirmar, solo compartir un link
 * público.
 */
export function CompartirBoton({ titulo, url }: CompartirBotonProps) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
      } catch {
        // el usuario cerró el panel nativo de compartir — no es un error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sin Web Share ni Clipboard (navegador viejo, contexto no seguro):
      // no hay nada más que este botón pueda hacer.
    }
  }

  return (
    <button type="button" onClick={compartir} className={styles.boton} aria-label="Compartir">
      {copiado ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 13 4.5 4.5L19 7" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="M8.2 10.7 15.8 6.3M8.2 13.3l7.6 4.4" />
        </svg>
      )}
    </button>
  );
}
