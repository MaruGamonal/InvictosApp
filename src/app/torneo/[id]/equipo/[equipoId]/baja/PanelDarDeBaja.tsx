'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

interface Props {
  torneoId: string;
  equipoId: string;
  torneoEnCurso: boolean;
}

/**
 * Motivos que tiene sentido que elija el propio equipo al retirarse —
 * `no_show` y `disciplinary` son resultados que el organizador
 * registra sobre un equipo, no algo que un capitán elija como su
 * propia razón para irse, así que no están acá (siguen existiendo en
 * el catálogo para ese otro camino).
 */
const MOTIVOS = [
  { valor: 'roster_incomplete', etiqueta: 'Falta de jugadores' },
  { valor: 'withdrew', etiqueta: 'Decisión propia' },
  { valor: 'other', etiqueta: 'Otro' },
];

export function PanelDarDeBaja({ torneoId, equipoId, torneoEnCurso }: Props) {
  const router = useRouter();
  const [motivo, setMotivo] = useState('roster_incomplete');
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/inscripciones/dar-de-baja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoId,
          equipoId,
          motivo,
          motivoDetalle: motivo === 'other' ? motivoDetalle : undefined,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo dar de baja al equipo.');
        setEnviando(false);
        return;
      }
      router.push(`/torneo/${torneoId}`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div className={styles.formulario}>
      <p className={styles.avisoInfo}>
        {torneoEnCurso
          ? 'El torneo está en curso: los partidos ya jugados se mantienen, y los pendientes se dan por ganados a sus rivales. No se puede deshacer.'
          : 'Tu equipo sale del torneo. No se puede deshacer.'}
      </p>

      {error && <p className={styles.errorChico}>{error}</p>}

      <span className={styles.subtitulo}>Motivo</span>
      <div className={styles.chipsMotivo}>
        {MOTIVOS.map((opcion) => (
          <label key={opcion.valor} className={styles.chipMotivo}>
            <input
              type="radio"
              name="motivo"
              checked={motivo === opcion.valor}
              onChange={() => setMotivo(opcion.valor)}
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>

      {motivo === 'other' && (
        <input
          type="text"
          required
          placeholder="Contá qué pasó"
          aria-label="Contá qué pasó"
          value={motivoDetalle}
          onChange={(evento) => setMotivoDetalle(evento.target.value)}
        />
      )}

      <button
        type="button"
        className={styles.botonPeligro}
        onClick={confirmar}
        disabled={enviando || (motivo === 'other' && motivoDetalle.trim() === '')}
      >
        {enviando ? 'Dando de baja…' : 'Confirmar baja del torneo'}
      </button>
    </div>
  );
}
