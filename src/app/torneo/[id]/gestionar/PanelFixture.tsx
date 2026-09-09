'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

export interface FaseGestion {
  id: string;
  nombre: string;
  tipoFase: 'league' | 'knockout';
  orden: number;
}

export interface PanelFixtureProps {
  fases: FaseGestion[];
  equipoNombres: Record<string, string>;
}

interface PartidoPropuesto {
  numeroFecha: number;
  equipoLocalId: string;
  equipoVisitanteId: string;
  grupoId: string | null;
}

interface AsignacionGrupo {
  equipoId: string;
  grupoId: string;
}

interface Propuesta {
  partidos: PartidoPropuesto[];
  asignacionesGrupo: AsignacionGrupo[];
  partidosJugadosQueSePerderian: number;
}

/**
 * UC-29 — Generar y confirmar el fixture de una fase. `generarFixture`
 * devuelve una propuesta sin persistir; acá se confirma tal cual viene
 * (`confirmarFixture` acepta exactamente esa forma) — editarla a mano
 * antes de confirmar queda para más adelante.
 */
export function PanelFixture({ fases, equipoNombres }: PanelFixtureProps) {
  const router = useRouter();
  const [faseActiva, setFaseActiva] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [confirmoPerdida, setConfirmoPerdida] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function nombreDe(equipoId: string): string {
    return equipoNombres[equipoId] ?? 'Equipo';
  }

  async function generar(faseId: string) {
    setFaseActiva(faseId);
    setPropuesta(null);
    setConfirmoPerdida(false);
    setError(null);
    try {
      const respuesta = await fetch('/api/fixture/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faseId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos generar el fixture.');
        return;
      }
      setPropuesta({
        partidos: cuerpo.data.partidos,
        asignacionesGrupo: cuerpo.data.asignacionesGrupo,
        partidosJugadosQueSePerderian: cuerpo.data.partidosJugadosQueSePerderian,
      });
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    }
  }

  async function confirmar(faseId: string) {
    if (!propuesta) return;
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/fixture/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faseId,
          partidos: propuesta.partidos,
          asignacionesGrupo: propuesta.asignacionesGrupo,
          confirmoPerdidaDeResultados: confirmoPerdida,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos confirmar el fixture.');
        return;
      }
      setPropuesta(null);
      setFaseActiva(null);
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.lista}>
      {error && <p className={styles.errorChico}>{error}</p>}
      {fases.map((fase) => (
        <div key={fase.id} className={styles.filaIntegrante}>
          <div className={styles.filaIntegranteCabecera}>
            <span className={styles.nombreIntegrante}>{fase.nombre}</span>
            <button type="button" onClick={() => generar(fase.id)} disabled={enviando}>
              Generar fixture
            </button>
          </div>

          {faseActiva === fase.id && propuesta && (
            <>
              <div className={styles.lista}>
                {propuesta.partidos.map((partido, indice) => (
                  <div key={indice} className={styles.filaPartido}>
                    <span className={styles.nombresPartido}>
                      {nombreDe(partido.equipoLocalId)} vs {nombreDe(partido.equipoVisitanteId)}
                    </span>
                    <span>Fecha {partido.numeroFecha}</span>
                  </div>
                ))}
              </div>

              {propuesta.partidosJugadosQueSePerderian > 0 && (
                <>
                  <p className={styles.avisoChico}>
                    Ya hay {propuesta.partidosJugadosQueSePerderian} resultado
                    {propuesta.partidosJugadosQueSePerderian === 1 ? '' : 's'} cargado
                    {propuesta.partidosJugadosQueSePerderian === 1 ? '' : 's'} en esta fase —
                    confirmar los reemplaza y se pierden.
                  </p>
                  <label className={styles.filaCheckbox}>
                    <input
                      type="checkbox"
                      checked={confirmoPerdida}
                      onChange={(evento) => setConfirmoPerdida(evento.target.checked)}
                    />
                    Entiendo que se pierden los resultados ya cargados
                  </label>
                </>
              )}

              <div className={styles.filaAcciones}>
                <button
                  type="button"
                  onClick={() => confirmar(fase.id)}
                  disabled={
                    enviando || (propuesta.partidosJugadosQueSePerderian > 0 && !confirmoPerdida)
                  }
                >
                  {enviando ? 'Confirmando…' : 'Confirmar fixture'}
                </button>
                <button
                  type="button"
                  className={styles.botonSecundarioChico}
                  onClick={() => {
                    setPropuesta(null);
                    setFaseActiva(null);
                  }}
                  disabled={enviando}
                >
                  Descartar
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
