'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

export interface ReglamentoVigenteProps {
  numeroVersion: number;
  texto: string | null;
  fechaPublicacion: string;
}

export interface FormularioReglamentoOrganizadorProps {
  torneoId: string;
  vigente: ReglamentoVigenteProps | null;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** UC-51 — Publicar una versión nueva del reglamento (texto; el archivo adjunto queda para cuando haya subida de archivos). */
export function FormularioReglamentoOrganizador({
  torneoId,
  vigente,
}: FormularioReglamentoOrganizadorProps) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/torneos/publicar-reglamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, texto }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos publicar el reglamento.');
        return;
      }
      setTexto('');
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.formularioChico}>
      {vigente ? (
        <p className={styles.avisoChico}>
          Versión {vigente.numeroVersion} vigente desde el{' '}
          {formatearFecha(vigente.fechaPublicacion)}. Publicar acá abajo crea una versión nueva.
        </p>
      ) : (
        <p className={styles.avisoChico}>Este torneo todavía no tiene reglamento — es opcional.</p>
      )}

      <form className={styles.formularioChico} onSubmit={enviar}>
        {error && <p className={styles.errorChico}>{error}</p>}
        <label>
          Nuevo reglamento
          <textarea
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Texto del reglamento…"
            required
          />
        </label>
        <button type="submit" disabled={enviando || !texto.trim()}>
          {enviando ? 'Publicando…' : 'Publicar reglamento'}
        </button>
      </form>
    </div>
  );
}
