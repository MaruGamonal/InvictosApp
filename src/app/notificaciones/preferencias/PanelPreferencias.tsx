'use client';

import { useState } from 'react';
import type { PreferenciaCategoria } from '@/services/notificaciones/obtenerPreferenciasNotificacion';
import type { CategoriaPreferencia } from '@/services/notificaciones/preferencias';
import styles from './pagina.module.css';

const ETIQUETAS: Record<CategoriaPreferencia, string> = {
  team_invitation: 'Invitaciones a un plantel',
  registration_status: 'Estado de una inscripción',
  match_schedule: 'Cambios de horario o cancha',
  followed_results: 'Resultados de lo que sigo',
  tournament_started: 'Inicio de un torneo',
  tournament_finished: 'Final de un torneo',
};

interface Props {
  preferenciasIniciales: PreferenciaCategoria[];
}

function IconoCampana() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

/**
 * UC-47 — Las accionables llegan siempre y sólo dentro de la aplicación;
 * las informativas tienen un switch que las apaga.
 *
 * Las accionables tenían un segundo botón para elegir si además llegaba
 * por correo. El correo de producto está apagado (ver
 * `CORREO_DE_PRODUCTO_ACTIVO` en `services/notificaciones/tipos.ts`):
 * dejar el botón habría sido ofrecer una opción que no hace nada, que
 * es peor que no ofrecerla.
 *
 * Siguen sin poder apagarse. Una invitación a un plantel o un cambio de
 * cancha son avisos que, si no llegan, dejan a alguien afuera de un
 * partido — y ahora que no hay un segundo canal de respaldo, menos
 * todavía.
 */
export function PanelPreferencias({ preferenciasIniciales }: Props) {
  const [preferencias, setPreferencias] = useState(preferenciasIniciales);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accionables = preferencias.filter((p) => p.accionable);
  const informativas = preferencias.filter((p) => !p.accionable);

  async function cambiar(categoria: CategoriaPreferencia, activo: boolean) {
    setEnviando(categoria);
    setError(null);
    const anteriores = preferencias;
    setPreferencias((actuales) =>
      actuales.map((p) => (p.categoria === categoria ? { ...p, inAppActivo: activo } : p)),
    );

    try {
      const respuesta = await fetch('/api/notificaciones/preferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, canal: 'in_app', activo }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setPreferencias(anteriores);
        setError(cuerpo?.error?.mensaje ?? 'No pudimos guardar el cambio. Probá de nuevo.');
      }
    } catch {
      setPreferencias(anteriores);
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <>
      {error && <p className={styles.errorChico}>{error}</p>}

      <span className={styles.tituloSeccion}>Accionables · siempre activas</span>
      <div className={styles.lista}>
        {accionables.map((pref) => (
          <div key={pref.categoria} className={styles.fila}>
            <span className={styles.filaTitulo}>{ETIQUETAS[pref.categoria]}</span>
            <div className={styles.canales}>
              <button
                type="button"
                className={`${styles.botonCanal} ${styles.botonCanalActivo}`}
                disabled
                aria-label={`${ETIQUETAS[pref.categoria]}: siempre activo dentro de la app`}
              >
                <IconoCampana />
              </button>
            </div>
          </div>
        ))}
      </div>

      <span className={styles.tituloSeccionNeutro}>Informativas</span>
      <div className={styles.lista}>
        {informativas.map((pref) => (
          <div key={pref.categoria} className={styles.fila}>
            <span className={styles.filaTitulo}>{ETIQUETAS[pref.categoria]}</span>
            <button
              type="button"
              className={
                pref.inAppActivo ? `${styles.switch} ${styles.switchActivo}` : styles.switch
              }
              role="switch"
              aria-checked={pref.inAppActivo}
              aria-label={ETIQUETAS[pref.categoria]}
              onClick={() => cambiar(pref.categoria, !pref.inAppActivo)}
              disabled={enviando !== null}
            >
              <span className={styles.switchPerilla} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
