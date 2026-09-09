'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EstadoVacio } from '@/components/EstadoVacio';
import styles from './pagina.module.css';

export interface PartidoResultado {
  id: string;
  numeroFecha: number;
  equipoLocalNombre: string;
  equipoVisitanteNombre: string;
  version: number;
}

export interface PanelResultadosProps {
  partidos: PartidoResultado[];
}

/** UC-31 — Cargar el resultado de un partido a mano, con su `version` para el optimistic concurrency. */
export function PanelResultados({ partidos }: PanelResultadosProps) {
  const router = useRouter();
  const [goles, setGoles] = useState<Record<string, { local: string; visitante: string }>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function actualizar(partidoId: string, campo: 'local' | 'visitante', valor: string) {
    setGoles((actual) => ({
      ...actual,
      [partidoId]: { local: '', visitante: '', ...actual[partidoId], [campo]: valor },
    }));
  }

  async function cargar(partido: PartidoResultado) {
    const valores = goles[partido.id];
    const golesLocal = Number(valores?.local);
    const golesVisitante = Number(valores?.visitante);
    if (!valores || !Number.isInteger(golesLocal) || !Number.isInteger(golesVisitante)) return;

    setEnviando(partido.id);
    setError(null);
    try {
      const respuesta = await fetch('/api/partidos/cargar-resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partidoId: partido.id,
          version: partido.version,
          golesLocal,
          golesVisitante,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos cargar el resultado.');
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(null);
    }
  }

  if (partidos.length === 0) {
    return <EstadoVacio mensaje="No hay partidos sin resultado." />;
  }

  return (
    <div className={styles.lista}>
      {error && <p className={styles.errorChico}>{error}</p>}
      {partidos.map((partido) => {
        const valores = goles[partido.id] ?? { local: '', visitante: '' };
        return (
          <div key={partido.id} className={styles.filaPartido}>
            <span className={styles.nombresPartido}>
              Fecha {partido.numeroFecha} — {partido.equipoLocalNombre} vs{' '}
              {partido.equipoVisitanteNombre}
            </span>
            <div className={styles.filaGoles}>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Goles de ${partido.equipoLocalNombre}`}
                value={valores.local}
                onChange={(evento) => actualizar(partido.id, 'local', evento.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Goles de ${partido.equipoVisitanteNombre}`}
                value={valores.visitante}
                onChange={(evento) => actualizar(partido.id, 'visitante', evento.target.value)}
              />
              <button
                type="button"
                onClick={() => cargar(partido)}
                disabled={enviando !== null || valores.local === '' || valores.visitante === ''}
              >
                {enviando === partido.id ? 'Guardando…' : 'Cargar'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
