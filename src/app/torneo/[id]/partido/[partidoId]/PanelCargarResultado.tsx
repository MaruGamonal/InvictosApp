'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GOLES_MAXIMOS_POR_EQUIPO } from '@/lib/marcador';
import { motivoDelFallo } from '@/components/avisos/motivoDelFallo';
import styles from './pagina.module.css';

export interface PanelCargarResultadoProps {
  partidoId: string;
  version: number;
  localNombre: string;
  visitanteNombre: string;
}

/**
 * UC-31 — El capitán carga el resultado de su partido (`06`, D-07b).
 *
 * **Por qué no existía y por qué importa.** `cargarResultado` acepta al
 * capitán de cualquiera de los dos equipos desde siempre, y cuando
 * carga un capitán el resultado queda `loaded` en vez de `confirmed`
 * (D-95) — esperando que el rival confirme u objete, o que el plazo lo
 * confirme solo. Todo eso estaba construido: el servicio, los permisos,
 * `confirmarResultado`, `disputarResultado`, `resolverDisputa`, el
 * panel de respuesta de esta misma pantalla y la tarea horaria
 * `confirmar-resultados-vencidos`.
 *
 * Lo que faltaba era el principio: ninguna pantalla dejaba cargar a un
 * capitán. Sin eso ningún resultado llegaba nunca a `loaded`, y toda la
 * conciliación entre los dos equipos no tenía sobre qué ocurrir.
 *
 * El resultado queda a nombre de quien lo carga y el rival recibe el
 * aviso: por eso el botón lo dice, en vez de un "Guardar" que no
 * anticipa que esto le llega a otro.
 */
export function PanelCargarResultado({
  partidoId,
  version,
  localNombre,
  visitanteNombre,
}: PanelCargarResultadoProps) {
  const router = useRouter();
  const [golesLocal, setGolesLocal] = useState('');
  const [golesVisitante, setGolesVisitante] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completo = golesLocal !== '' && golesVisitante !== '';

  async function cargar() {
    if (!completo || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/partidos/cargar-resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partidoId,
          version,
          golesLocal: Number(golesLocal),
          golesVisitante: Number(golesVisitante),
        }),
      });
      const cuerpo = await respuesta.json();
      // `fetch` no lanza con 4xx ni 5xx: sin este chequeo, un rechazo
      // del servidor se vería como un resultado cargado.
      if (!respuesta.ok || !cuerpo.ok) {
        setError(motivoDelFallo(cuerpo, 'No pudimos cargar el resultado.'));
        setEnviando(false);
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <section className={styles.bloqueCargar}>
      <h2 className={styles.tituloBloque}>Cargar el resultado</h2>
      <p className={styles.textoBloque}>
        Queda cargado a tu nombre y le llega al otro equipo para que lo confirme o lo objete.
      </p>

      <div className={styles.filaCarga}>
        <label className={styles.campoGoles}>
          <span className={styles.nombreEquipoCarga}>{localNombre}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={GOLES_MAXIMOS_POR_EQUIPO}
            value={golesLocal}
            onChange={(evento) => setGolesLocal(evento.target.value)}
            disabled={enviando}
            aria-label={`Goles de ${localNombre}`}
          />
        </label>
        <label className={styles.campoGoles}>
          <span className={styles.nombreEquipoCarga}>{visitanteNombre}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={GOLES_MAXIMOS_POR_EQUIPO}
            value={golesVisitante}
            onChange={(evento) => setGolesVisitante(evento.target.value)}
            disabled={enviando}
            aria-label={`Goles de ${visitanteNombre}`}
          />
        </label>
      </div>

      {error && <p className={styles.errorCarga}>{error}</p>}

      <button
        type="button"
        className={styles.botonCargar}
        onClick={cargar}
        disabled={!completo || enviando}
      >
        {enviando ? 'Cargando…' : 'Cargar resultado'}
      </button>
    </section>
  );
}
