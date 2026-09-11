'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/ingresar/pagina.module.css';
import pasoStyles from './pagina.module.css';

interface Props {
  torneoId: string;
}

/** UC-18 — Publicar el torneo: `draft → registration_open`. */
export function PanelPublicarInicial({ torneoId }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publicar() {
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/torneos/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo publicar el torneo.');
        setEnviando(false);
        return;
      }
      router.push(`/torneo/${torneoId}/gestionar`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div>
      {error && <p className={pasoStyles.errorChico}>{error}</p>}
      <button type="button" className={styles.boton} onClick={publicar} disabled={enviando}>
        {enviando ? 'Publicando…' : 'Publicar'}
      </button>
    </div>
  );
}
