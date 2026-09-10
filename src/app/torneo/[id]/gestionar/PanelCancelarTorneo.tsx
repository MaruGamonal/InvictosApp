'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

export interface PanelCancelarTorneoProps {
  torneoId: string;
}

const MOTIVOS = [
  { valor: 'insufficient_teams', etiqueta: 'Falta de equipos' },
  { valor: 'weather', etiqueta: 'Clima' },
  { valor: 'venue_unavailable', etiqueta: 'Problemas con la sede' },
  { valor: 'organizer_decision', etiqueta: 'Decisión del organizador' },
  { valor: 'other', etiqueta: 'Otro' },
];

/**
 * UC-21 — Cancelar el torneo, definitivo (a diferencia de "Suspender",
 * más arriba, que se puede retomar). Los partidos ya jugados cuentan
 * para el score de los equipos igual: cancelar no los borra.
 */
export function PanelCancelarTorneo({ torneoId }: PanelCancelarTorneoProps) {
  const router = useRouter();
  const [motivo, setMotivo] = useState('insufficient_teams');
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/torneos/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoId,
          motivo,
          motivoDetalle: motivo === 'other' ? motivoDetalle : undefined,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo cancelar el torneo.');
        setEnviando(false);
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        className={styles.botonPeligroChico}
        onClick={() => setConfirmando(true)}
      >
        Cancelar torneo
      </button>
    );
  }

  return (
    <form className={styles.formularioChico} onSubmit={cancelar}>
      {error && <p className={styles.errorChico}>{error}</p>}

      <span>Motivo</span>
      <div className={styles.chipsRoles}>
        {MOTIVOS.map((opcion) => (
          <label key={opcion.valor} className={styles.chipRol}>
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
          value={motivoDetalle}
          onChange={(evento) => setMotivoDetalle(evento.target.value)}
        />
      )}

      <p className={styles.avisoChico}>
        Los partidos ya jugados cuentan para el score de los equipos, aunque el torneo no
        termine — nadie es responsable de la cancelación.
      </p>

      <div className={styles.filaAcciones}>
        <button type="submit" className={styles.botonPeligro} disabled={enviando}>
          {enviando ? 'Cancelando…' : 'Cancelar torneo'}
        </button>
        <button
          type="button"
          className={styles.botonSecundarioChico}
          onClick={() => setConfirmando(false)}
          disabled={enviando}
        >
          Volver
        </button>
      </div>
    </form>
  );
}
