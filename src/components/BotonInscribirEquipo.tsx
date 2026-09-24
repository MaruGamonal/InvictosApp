'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      advertenciaMultiplesDivisiones: boolean;
      equipoId: string;
    }
  | { tipo: 'error'; equipos: EquipoGestionable[]; equipoId: string; mensaje: string };

/**
 * Lo que dice el botón una vez que hay inscripción. Reemplaza al cartel
 * que antes se metía debajo: pedido en vivo, el mismo patrón que
 * "Siguiendo ✓" y "Pedido enviado ✓" — el estado vive **en el control
 * que lo produjo**, no en un bloque aparte que empuja la pantalla.
 */
const ETIQUETA_POR_ESTADO: Record<'pending' | 'waitlisted' | 'approved', string> = {
  pending: 'Solicitud enviada ✓',
  waitlisted: 'En lista de espera',
  approved: 'Inscripto ✓',
};

/** El detalle, para quien toque el botón y quiera saber qué sigue. */
const MENSAJE_POR_ESTADO: Record<'pending' | 'waitlisted' | 'approved', string> = {
  pending: 'Solicitud enviada — el organizador la va a aprobar o rechazar.',
  waitlisted: 'El torneo ya completó su cupo: quedaste en lista de espera.',
  approved: '¡Inscripto! Ya sos parte de los equipos confirmados.',
};

const ESTADOS_VIGENTES = new Set(['pending', 'waitlisted', 'approved']);

function esEstadoVigente(estado: string): estado is 'pending' | 'waitlisted' | 'approved' {
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
 *
 * **Es una píldora, no un panel.** Vive en la cabecera oscura junto a
 * "Seguir" y "Compartir", igual que en el perfil del equipo, así que lo
 * único que puede ocupar ese lugar es un control del tamaño de los
 * otros. El estado se dice ahí mismo —"Solicitud enviada ✓"— en vez de
 * insertar un cartel debajo que corre la pantalla.
 *
 * Todo lo que no entra en una píldora —elegir equipo, aceptar el
 * reglamento, las advertencias, los enlaces de la inscripción
 * aprobada— va a un diálogo. `<dialog>` nativo y no un panel propio:
 * trae el foco atrapado, el cierre con Escape y el fondo inerte sin
 * escribir nada de eso.
 */
export function BotonInscribirEquipo({ torneoId, reglamentoVigente }: BotonInscribirEquipoProps) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>({ tipo: 'inicial' });
  /** Abrir el detalle de una inscripción ya hecha es decisión de quien mira. */
  const [viendoDetalle, setViendoDetalle] = useState(false);
  const dialogoRef = useRef<HTMLDialogElement>(null);

  function cerrarDialogo() {
    setViendoDetalle(false);
    // Volver al inicio solo desde los pasos del formulario: cerrar el
    // detalle de una inscripción hecha no la deshace.
    setPaso((actual) =>
      actual.tipo === 'sin-equipos' ||
      actual.tipo === 'eligiendo' ||
      actual.tipo === 'error' ||
      actual.tipo === 'enviando'
        ? { tipo: 'inicial' }
        : actual,
    );
  }

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/torneos/mi-inscripcion?torneoId=${torneoId}`)
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((cuerpo) => {
        if (cancelado) return;
        const inscripciones: Array<{
          estado: string;
          advertenciaCategoria: boolean;
          advertenciaMultiplesDivisiones: boolean;
          equipoId: string;
        }> = cuerpo?.data ?? [];
        const vigente = inscripciones.find((i) => esEstadoVigente(i.estado));
        if (vigente && esEstadoVigente(vigente.estado)) {
          setPaso({
            tipo: 'enviado',
            estado: vigente.estado,
            advertenciaCategoria: vigente.advertenciaCategoria,
            advertenciaMultiplesDivisiones: vigente.advertenciaMultiplesDivisiones,
            equipoId: vigente.equipoId,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [torneoId]);

  // El `<dialog>` se abre y se cierra por método, no por atributo: es la
  // única forma de que el navegador atrape el foco y vuelva a soltarlo.
  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!dialogo) return;
    const debeAbrir =
      viendoDetalle ||
      paso.tipo === 'sin-equipos' ||
      paso.tipo === 'eligiendo' ||
      paso.tipo === 'enviando' ||
      paso.tipo === 'error';
    if (debeAbrir && !dialogo.open) dialogo.showModal();
    if (!debeAbrir && dialogo.open) dialogo.close();
  }, [paso.tipo, viendoDetalle]);

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
        advertenciaMultiplesDivisiones: cuerpo.data.advertenciaMultiplesDivisiones,
        equipoId,
      });
    } catch {
      setPaso({
        tipo: 'error',
        equipos,
        equipoId,
        mensaje: 'No pudimos conectar. Probá de nuevo.',
      });
    }
  }

  // El formulario y el detalle viven en el diálogo; la píldora, en la
  // cabecera. Estos son los pasos que necesitan el diálogo abierto.
  const pasoNecesitaDialogo =
    paso.tipo === 'sin-equipos' ||
    paso.tipo === 'eligiendo' ||
    paso.tipo === 'enviando' ||
    paso.tipo === 'error';
  const abierto = pasoNecesitaDialogo || viendoDetalle;

  const etiquetaPildora =
    paso.tipo === 'cargando'
      ? 'Un momento…'
      : paso.tipo === 'enviado'
        ? ETIQUETA_POR_ESTADO[paso.estado]
        : 'Inscribir a mi equipo';

  return (
    <>
      <button
        type="button"
        className={paso.tipo === 'enviado' ? styles.pildoraHecha : styles.pillPrimaria}
        onClick={paso.tipo === 'enviado' ? () => setViendoDetalle(true) : empezar}
        disabled={paso.tipo === 'cargando'}
      >
        {etiquetaPildora}
      </button>

      <dialog ref={dialogoRef} className={styles.dialogo} onClose={cerrarDialogo}>
        {abierto && (
          <div className={styles.panel}>
            <div className={styles.filaTitulo}>
              <h3 className={styles.tituloPanel}>
                {paso.tipo === 'enviado' ? 'Tu inscripción' : 'Inscribir tu equipo'}
              </h3>
              <button
                type="button"
                className={styles.cerrar}
                onClick={cerrarDialogo}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            {cuerpoDelDialogo()}
          </div>
        )}
      </dialog>
    </>
  );

  function cuerpoDelDialogo() {
    if (paso.tipo === 'sin-equipos') {
      return (
        <p className={styles.mensajeSinEquipos}>
          Para inscribir un equipo tenés que ser Capitán o Delegado de alguno.{' '}
          <Link href="/equipo/crear" className={styles.enlaceCrearEquipo}>
            Creá tu equipo
          </Link>
        </p>
      );
    }

    if (paso.tipo === 'enviado') {
      return (
        <>
          <p className={styles.textoEnviado}>{MENSAJE_POR_ESTADO[paso.estado]}</p>
          {paso.advertenciaCategoria && (
            <p className={styles.advertencia}>
              La categoría de tu equipo no coincide con la de este torneo — el organizador lo va a
              ver así al resolver la solicitud.
            </p>
          )}
          {paso.advertenciaMultiplesDivisiones && (
            <p className={styles.advertencia}>
              Tu equipo ya está inscripto en otra división de este mismo certamen — el organizador
              lo va a ver así al resolver la solicitud.
            </p>
          )}
          {paso.estado === 'approved' && (
            <div className={styles.enlacesInscripcion}>
              <Link href={`/torneo/${torneoId}/equipo/${paso.equipoId}/lista-buena-fe`}>
                Lista de buena fe
              </Link>
              <Link href={`/torneo/${torneoId}/equipo/${paso.equipoId}/baja`}>
                Dar de baja del torneo
              </Link>
            </div>
          )}
        </>
      );
    }

    if (paso.tipo === 'inicial' || paso.tipo === 'cargando') return null;

    // 'eligiendo' | 'enviando' | 'error'
    const equipoSeleccionado = paso.equipos.find((e) => e.id === paso.equipoId) ?? paso.equipos[0]!;
    const acepto = paso.tipo === 'eligiendo' ? paso.acepto : true;
    const enviando = paso.tipo === 'enviando';

    return (
      <>
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
      </>
    );
  }
}
