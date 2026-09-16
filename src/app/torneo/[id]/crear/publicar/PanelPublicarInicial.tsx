'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);

  async function publicar() {
    setEnviando(true);
    setError(null);
    setCamposFaltantes([]);
    try {
      const respuesta = await fetch('/api/torneos/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo publicar el torneo.');
        if (Array.isArray(cuerpo?.error?.detalle)) {
          const nombres = (cuerpo.error.detalle as Array<{ campo?: unknown }>)
            .map((item) => item?.campo)
            .filter((campo): campo is string => typeof campo === 'string');
          setCamposFaltantes(nombres);
        }
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
      {error && (
        <>
          <p className={pasoStyles.errorChico}>{error}</p>
          {camposFaltantes.length > 0 && (
            <p className={pasoStyles.errorChico}>
              Falta: {camposFaltantes.join(', ')}. Completalo desde{' '}
              <Link href={`/torneo/${torneoId}/gestionar/configuracion`}>Configuración</Link>.
            </p>
          )}
        </>
      )}
      <button type="button" className={styles.boton} onClick={publicar} disabled={enviando}>
        {enviando ? 'Publicando…' : 'Publicar'}
      </button>
    </div>
  );
}
