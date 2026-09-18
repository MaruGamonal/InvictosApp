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
  advertenciaMultiplesDivisiones: boolean;
}

export interface DivisionDelCertamenProps {
  id: string;
  division: string;
  estado: string;
}

export interface PanelInscripcionesProps {
  torneoId: string;
  inscripciones: InscripcionGestion[];
  cupoEquipos: number;
  /** Otras divisiones del mismo certamen (`06`, D-103) — habilitan el rechazo por `wrong_division` (D-108). */
  divisionesDelCertamen?: DivisionDelCertamenProps[];
}

const MOTIVOS = [
  { valor: 'withdrew', etiqueta: 'El equipo se retiró' },
  { valor: 'no_show', etiqueta: 'No se presentó' },
  { valor: 'roster_incomplete', etiqueta: 'No completó el plantel' },
  { valor: 'disciplinary', etiqueta: 'Sanción' },
  { valor: 'wrong_division', etiqueta: 'División equivocada' },
  { valor: 'other', etiqueta: 'Otro' },
];

const ESTADOS_PENDIENTES = new Set(['pending', 'waitlisted']);

/** UC-25 — Aprobar o rechazar cada inscripción pendiente o en lista de espera. */
export function PanelInscripciones({
  torneoId,
  inscripciones,
  cupoEquipos,
  divisionesDelCertamen = [],
}: PanelInscripcionesProps) {
  const router = useRouter();
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('withdrew');
  const [divisionSugerida, setDivisionSugerida] = useState(divisionesDelCertamen[0]?.id ?? '');
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const motivosDisponibles =
    divisionesDelCertamen.length > 0
      ? MOTIVOS
      : MOTIVOS.filter((m) => m.valor !== 'wrong_division');

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
          motivoDetalle:
            decision === 'rejected' && motivo === 'wrong_division' ? divisionSugerida : undefined,
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

  const confirmados = inscripciones.filter((i) => i.estado === 'approved');
  const aprobadas = confirmados.length;
  const pendientes = inscripciones.filter((i) => ESTADOS_PENDIENTES.has(i.estado));
  const otrosResueltos = inscripciones.filter(
    (i) => !ESTADOS_PENDIENTES.has(i.estado) && i.estado !== 'approved',
  );

  return (
    <div className={styles.lista}>
      <p className={styles.contadorCupo}>
        {aprobadas} / {cupoEquipos} cupos ocupados
      </p>
      {error && <p className={styles.errorChico}>{error}</p>}

      {pendientes.length > 0 && <span className={styles.tituloSeccion}>Solicitudes</span>}
      {pendientes.length === 0 && confirmados.length === 0 && otrosResueltos.length === 0 ? (
        <EstadoVacio mensaje="No hay inscripciones pendientes de resolver." />
      ) : (
        pendientes.map((inscripcion) => (
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
            {inscripcion.advertenciaMultiplesDivisiones && (
              <p className={styles.avisoChico}>
                Este equipo ya está inscripto en otra división de este certamen.
              </p>
            )}

            {rechazando === inscripcion.equipoId ? (
              <div className={styles.filaAccion}>
                <select value={motivo} onChange={(evento) => setMotivo(evento.target.value)}>
                  {motivosDisponibles.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
                {motivo === 'wrong_division' && (
                  <select
                    value={divisionSugerida}
                    onChange={(evento) => setDivisionSugerida(evento.target.value)}
                    aria-label="División sugerida"
                  >
                    {divisionesDelCertamen.map((d) => (
                      <option key={d.id} value={d.id}>
                        División {d.division}
                      </option>
                    ))}
                  </select>
                )}
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
                  {enviando === inscripcion.equipoId ? 'Aprobando…' : 'Aprobar'}
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
        ))
      )}

      {confirmados.length > 0 && (
        <div className={styles.lista}>
          <span className={styles.tituloSeccion}>
            Equipos confirmados
            <span className={styles.contadorSeccion}> · {confirmados.length}</span>
          </span>
          {confirmados.map((inscripcion) => (
            <div key={inscripcion.equipoId} className={styles.filaConfirmado}>
              <svg
                className={styles.iconoConfirmado}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
              <span className={styles.nombreIntegrante}>{inscripcion.nombreEquipo}</span>
            </div>
          ))}
        </div>
      )}

      {otrosResueltos.length > 0 && (
        <div className={styles.lista}>
          <span className={styles.tituloSeccion}>Otras solicitudes</span>
          {otrosResueltos.map((inscripcion) => (
            <div key={inscripcion.equipoId} className={styles.filaIntegranteCabecera}>
              <span className={styles.nombreIntegrante}>{inscripcion.nombreEquipo}</span>
              <Badge campo="inscripcion.estado" valor={inscripcion.estado} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
