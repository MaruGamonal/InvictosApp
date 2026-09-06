'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';

export interface RegistrarEventoProps {
  evento: string;
  propiedades?: Record<string, string | number | boolean | null>;
}

/**
 * Dispara uno de los cuatro eventos de producto de T28 (`src/lib/analitica.ts`)
 * cuando la pantalla se monta en el navegador. Server Components no pueden
 * llamar a `track` directamente — la analítica de Vercel corre en el
 * cliente — así que esta pieza chica es la única que necesita `'use client'`.
 */
export function RegistrarEvento({ evento, propiedades }: RegistrarEventoProps) {
  useEffect(() => {
    track(evento, propiedades);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento]);

  return null;
}
