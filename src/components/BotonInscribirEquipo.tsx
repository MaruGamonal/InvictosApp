'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BotonInscribirEquipo.module.css';

export interface ReglamentoVigenteProps {
  numeroVersion: number;
  texto: string | null;
  archivoUrl: string | null;
}

export interface BotonInscribirEquipoProps {
  torneoId: string;
  reglamentoVigente: ReglamentoVigenteProps | null;
}

interface EquipoGestionable {
  id: string;
  nombre: string;
  categoriaGenero: string;
}

type Paso =
  | { tipo: 'inicial' }
  | { tipo: 'cargando' }
  | { tipo: 'sin-equipos' }
  | { tipo: 'eligiendo'; equipos: EquipoGestionable[]; equipoId: string; acepto: boolean }
  | { tipo: 'enviando'; equipos: EquipoGestionable[]; equipoId: string }
  | {
      tipo: 'enviado';
      estado: 'pending' | 'waitlisted' | 'approved';
      advertenciaCategoria: boolean;
    }
  | { tipo: 'error'; equipos: EquipoGestionable[]; equipoId: string; mensaje: string };

const MENSAJE_POR_ESTADO: Record<'pending' | 'waitlisted' | 'approved', string> = {
  pending: 'Solicitud enviada — el organizador la va a aprobar o rechazar.',
  waitlisted: 'El torneo ya completó su cupo: quedaste en lista de espera.',
  approved: '¡Inscripto! Ya sos parte de los equipos confirmados.',
};

const ESTADOS_VIGENTES = new Set(['pending', 'waitlisted', 'approved']);

function esEstadoVigente(
  estado: string,
): estado is 'pending' | 'waitlisted' | 'approved' {
  return ESTADOS_VIGENTES.has(estado);
}

/**
 * UC-24 — Inscribir a uno de mis equipos en este torneo. La ficha es
 * pública y cacheada por evento (D-04b): sin sesión, el primer click
 * manda a /ingresar en vez de mostrar el panel — recién ahí se sabe
 * quién es capitana o delegada de qué. Por la misma razón, tampoco puede
 * nacer sabiendo si ya mandé la solicitud: al montar, se fija si alguno
 * de mis equipos ya tiene una inscripción vigente en este torneo — si la
 * tiene, muestra ese estado directamente en vez de volver a ofrecer
 * "Inscribir a mi equipo" (reportado en vivo: volver a la ficha después
 * de inscribirse lo seguía ofreciendo como si nada).
 */
export function BotonInscribirEquipo({ torneoId, reglamentoVigente }: BotonInscribirEquipoProps) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>({ tipo: 'inicial' });

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/torneos/mi-inscripcion?torneoId=${torneoId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        if (cancelado) return;
        const inscripciones: Array<{ estado: string; advertenciaCategoria: boolean }> =
          cuerpo?.data ?? [];
        const vigente = inscripciones.find((i) => esEstadoVigente(i.estado));
        if (vigente && esEstadoVigente(vigente.estado)) {
          setPaso({
            tipo: 'enviado',
            estado: vigente.estado,
            advertenciaCategoria: vigente.advertenciaCategoria,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [torneoId]);

  async function empezar() {
    setPaso({ tipo: 'cargando' });
    try {
      const respuesta = await fetch('/api/equipos/mios');
      if (respuesta.status === 401) {
        router.push('/ingresar');
        return;
      }
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setPaso({ tipo: 'inicial' });
        return;
      }
      const equipos: EquipoGestionable[] = cuerpo.data;
      if (equipos.length === 0) {
        setPaso({ tipo: 'sin-equipos' });
        return;
      }
      setPaso({ tipo: 'eligiendo', equipos, equipoId: equipos[0]!.id, acepto: !reglamentoVigente });
    } catch {
      setPaso({ tipo: 'inicial' });
    }
  }

  async function confirmar() {
    if (paso.tipo !== 'eligiendo') return;
    const { equipos, equipoId } = paso;
    setPaso({ tipo: 'enviando', equipos, equipoId });
    try {
      const respuesta = await fetch('/api/solicitar-inscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoId,
          equipoId,
          aceptoReglamentoVersion: reglamentoVigente?.numeroVersion,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setPaso({
          tipo: 'error',
          equipos,
          equipoId,
          mensaje: cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.',
        });
        return;
      }
      setPaso({
        tipo: 'enviado',
        estado: cuerpo.data.estado,
        advertenciaCategoria: cuerpo.data.advertenciaCategoria,
      });
    } catch {
      setPaso({
        tipo: 'error',
        equipos,
        equipoId,
        mensaje: 'No pudimos conectar. Revisá tu conexión e intentá de nuevo.',
      });
    }
  }

  if (paso.tipo === 'inicial' || paso.tipo === 'cargando') {
    return (
      <button
        type="button"
        className={styles.pillPrimaria}
        onClick={empezar}
        disabled={paso.tipo === 'cargando'}
      >
        {paso.tipo === 'cargando' ? 'Un momento…' : 'Inscribir a mi equipo'}
      </button>
    );
  }

  if (paso.tipo === 'sin-equipos') {
    return (
      <p className={styles.mensajeSinEquipos}>
        Para inscribir un equipo tenés que ser Capitana o Delegada de alguno.
      </p>
    );
  }

  if (paso.tipo === 'enviado') {
    return (
      <div className={styles.panel}>
        <p className={styles.textoEnviado}>{MENSAJE_POR_ESTADO[paso.estado]}</p>
        {paso.advertenciaCategoria && (
          <p className={styles.advertencia}>
            La categoría de tu equipo no coincide con la de este torneo — el organizador lo va a ver
            así al resolver la solicitud.
          </p>
        )}
      </div>
    );
  }

  // 'eligiendo' | 'enviando' | 'error'
  const equipoSeleccionado = paso.equipos.find((e) => e.id === paso.equipoId) ?? paso.equipos[0]!;
  const acepto = paso.tipo === 'eligiendo' ? paso.acepto : true;
  const enviando = paso.tipo === 'enviando';

  return (
    <div className={styles.panel}>
      <h3 className={styles.tituloPanel}>Inscribir tu equipo</h3>

      {paso.tipo === 'error' && <p className={styles.error}>{paso.mensaje}</p>}

      {paso.equipos.length > 1 ? (
        <label className={styles.campo}>
          <span>Equipo</span>
          <select
            value={paso.equipoId}
            disabled={enviando}
            onChange={(evento) =>
              setPaso({
                tipo: 'eligiendo',
                equipos: paso.equipos,
                equipoId: evento.target.value,
                acepto,
              })
            }
          >
            {paso.equipos.map((equipo) => (
              <option key={equipo.id} value={equipo.id}>
                {equipo.nombre}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className={styles.equipoUnico}>{equipoSeleccionado.nombre}</p>
      )}

      {reglamentoVigente && (
        <div className={styles.reglamento}>
          <p className={styles.tituloReglamento}>
            Reglamento — versión {reglamentoVigente.numeroVersion}
          </p>
          {reglamentoVigente.texto && (
            <p className={styles.textoReglamento}>{reglamentoVigente.texto}</p>
          )}
          {reglamentoVigente.archivoUrl && (
            <a href={reglamentoVigente.archivoUrl} target="_blank" rel="noreferrer">
              Ver archivo adjunto
            </a>
          )}
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={acepto}
              disabled={enviando}
              onChange={(evento) =>
                setPaso({
                  tipo: 'eligiendo',
                  equipos: paso.equipos,
                  equipoId: paso.equipoId,
                  acepto: evento.target.checked,
                })
              }
            />
            Leí y acepto el reglamento
          </label>
        </div>
      )}

      <button
        type="button"
        className={styles.pillPrimaria}
        onClick={confirmar}
        disabled={enviando || !acepto}
      >
        {enviando ? 'Enviando…' : 'Confirmar inscripción'}
      </button>
    </div>
  );
}
