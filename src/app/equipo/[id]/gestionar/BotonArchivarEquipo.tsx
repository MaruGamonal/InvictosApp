'use client';

import { useState } from 'react';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
}

/** UC-15 — cliente de `POST /api/equipos/archivar`. Exclusivo del Capitán. */
export function BotonArchivarEquipo({ equipoId }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function archivar() {
    if (enviando) return;
    if (!window.confirm('¿Archivar este equipo? Es una baja lógica, no se deshace desde acá.')) {
      return;
    }
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/equipos/archivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo archivar. Probá de nuevo.');
        setEnviando(false);
        return;
      }
      window.location.assign(`/equipo/${equipoId}`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div>
      {error && <p className={styles.errorChico}>{error}</p>}
      <button type="button" className={styles.botonPeligro} onClick={archivar} disabled={enviando}>
        {enviando ? 'Archivando…' : 'Archivar equipo'}
      </button>
    </div>
  );
}
