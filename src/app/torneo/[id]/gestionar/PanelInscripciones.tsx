'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EstadoVacio } from '@/components/EstadoVacio';
import { Badge } from '@/components/Badge';
import styles from './pagina.module.css';

export interface InscripcionGestion {
  equipoId: string;
  nombreEquipo: string;
  estado: string;
  advertenciaCategoria: boolean;
}

export interface PanelInscripcionesProps {
  torneoId: string;
  inscripciones: InscripcionGestion[];
}

const MOTIVOS = [
  { valor: 'withdrew', etiqueta: 'El equipo se retiró' },
  { valor: 'no_show', etiqueta: 'No se presentó' },
  { valor: 'roster_incomplete', etiqueta: 'No completó el plantel' },
  { valor: 'disciplinary', etiqueta: 'Sanción' },
  { valor: 'other', etiqueta: 'Otro' },
];

/** UC-25 — Aprobar o rechazar cada inscripción pendiente o en lista de espera. */
export function PanelInscripciones({ torneoId, inscripciones }: PanelInscripcionesProps) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('withdrew');
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolver(equipoId: string, decision: 'approved' | 'rejected') {
    setEnviando(equipoId);
    setError(null);
    try {
      const respuesta = await fetch('/api/inscripciones/resolver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoId,
          equipoId,
          decision,
          motivo: decision === 'rejected' ? motivo : undefined,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos resolver la inscripción.');
        return;
      }
      setRechazando(null);
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(null);
    }
  }

  if (inscripciones.length === 0) {
    return <EstadoVacio mensaje="No hay inscripciones pendientes de resolver." />;
  }

  return (
    <div className={styles.lista}>
      {error && <p className={styles.errorChico}>{error}</p>}
      {inscripciones.map((inscripcion) => (
        <div key={inscripcion.equipoId} className={styles.filaIntegrante}>
          <div className={styles.filaIntegranteCabecera}>
            <span className={styles.nombreIntegrante}>{inscripcion.nombreEquipo}</span>
            <Badge campo="inscripcion.estado" valor={inscripcion.estado} />
          </div>
          {inscripcion.advertenciaCategoria && (
            <p className={styles.avisoChico}>
              La categoría del equipo no coincide con la del torneo.
            </p>
          )}

          {rechazando === inscripcion.equipoId ? (
            <div className={styles.filaAccion}>
              <select value={motivo} onChange={(evento) => setMotivo(evento.target.value)}>
                {MOTIVOS.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => resolver(inscripcion.equipoId, 'rejected')}
                disabled={enviando !== null}
              >
                Confirmar rechazo
              </button>
              <button
                type="button"
                className={styles.botonSecundarioChico}
                onClick={() => setRechazando(null)}
                disabled={enviando !== null}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className={styles.filaAccion}>
              <button
                type="button"
                onClick={() => resolver(inscripcion.equipoId, 'approved')}
                disabled={enviando !== null}
              >
                {enviando === inscripcion.equipoId ? 'Enviando…' : 'Aprobar'}
              </button>
              <button
                type="button"
                className={styles.botonPeligroChico}
                onClick={() => setRechazando(inscripcion.equipoId)}
                disabled={enviando !== null}
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
