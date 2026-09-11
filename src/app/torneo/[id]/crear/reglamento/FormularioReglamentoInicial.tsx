'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/ingresar/pagina.module.css';

interface Props {
  torneoId: string;
}

/** UC-51 — Reglamento opcional al crear el torneo: texto y/o PDF, o directamente omitir. */
export function FormularioReglamentoInicial({ torneoId }: Props) {
  const router = useRouter();
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    setSubiendo(true);
    setError(null);
    try {
      const datosFormulario = new FormData();
      datosFormulario.append('torneoId', torneoId);
      datosFormulario.append('archivo', archivo);
      const respuesta = await fetch('/api/torneos/reglamento-archivo', {
        method: 'POST',
        body: datosFormulario,
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo subir el archivo.');
        return;
      }
      setArchivoUrl(cuerpo.data.archivoUrl);
      setNombreArchivo(archivo.name);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setSubiendo(false);
    }
  }

  async function continuar() {
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/torneos/publicar-reglamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoId,
          texto: texto.trim() || undefined,
          archivoUrl: archivoUrl ?? undefined,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo guardar el reglamento.');
        setEnviando(false);
        return;
      }
      router.push(`/torneo/${torneoId}/crear/publicar`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  const hayContenido = texto.trim() !== '' || archivoUrl !== null;

  return (
    <div className={styles.campo}>
      {error && <p className={styles.error}>{error}</p>}

      <textarea
        rows={6}
        placeholder="Escribí el reglamento, o subí un archivo abajo"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
      />

      <input
        ref={inputArchivoRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={elegirArchivo}
      />
      <button
        type="button"
        className={styles.botonAdjuntar}
        onClick={() => inputArchivoRef.current?.click()}
        disabled={subiendo}
      >
        ↑ {subiendo ? 'Subiendo…' : nombreArchivo ? nombreArchivo : 'Adjuntar archivo (PDF)'}
      </button>

      <button
        type="button"
        className={styles.boton}
        onClick={continuar}
        disabled={enviando || subiendo || !hayContenido}
      >
        {enviando ? 'Guardando…' : 'Continuar a publicar'}
      </button>
      <button
        type="button"
        className={styles.enlaceOmitir}
        onClick={() => router.push(`/torneo/${torneoId}/crear/publicar`)}
        disabled={enviando}
      >
        Omitir — es opcional
      </button>
    </div>
  );
}
