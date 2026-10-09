'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAvisos } from '@/components/avisos/Avisos';
import { motivoDelFallo } from '@/components/avisos/motivoDelFallo';
import styles from './pagina.module.css';

export interface PanelAjustePuntosProps {
  torneoId: string;
  equipoId: string;
  nombreEquipo: string;
  /** Lo acumulado hasta ahora. `0` es lo normal. */
  ajustePuntos: number;
  ultimoAjusteMotivo: string | null;
}

/**
 * UC-35 — Quita o bonificación de puntos (`06`, D-35b).
 *
 * **Por qué aparece recién ahora.** `ajustarPuntos` existe y está
 * probado, `posicion.ajuste_puntos` está en el esquema desde el
 * principio y la tabla de posiciones **ya lo suma** al ordenar y al
 * mostrar. Lo único que faltaba era quien lo escribiera: el servicio
 * sólo se podía invocar desde sus propios tests. Un torneo amateur sin
 * forma de descontar puntos no puede aplicar una sanción.
 *
 * **El motivo es obligatorio** —lo exige el servicio— y la pantalla
 * muestra el último: tres puntos menos sin explicación al lado es una
 * tabla que el organizador no puede defender cuando se la discuten.
 *
 * El ajuste **se suma** al que ya había, no lo reemplaza: dos fechas
 * con una quita de 1 son −2. Por eso el campo arranca vacío cada vez y
 * no con lo acumulado, que se lee al lado.
 */
export function PanelAjustePuntos({
  torneoId,
  equipoId,
  nombreEquipo,
  ajustePuntos,
  ultimoAjusteMotivo,
}: PanelAjustePuntosProps) {
  const router = useRouter();
  const avisos = useAvisos();
  const [abierto, setAbierto] = useState(false);
  const [ajuste, setAjuste] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cantidad = Number(ajuste);
  const valido =
    ajuste !== '' && Number.isInteger(cantidad) && cantidad !== 0 && motivo.trim() !== '';

  async function aplicar() {
    if (!valido || enviando) return;
    setEnviando(true);
    const enCurso = avisos.cargando('Aplicando el ajuste…');
    try {
      const respuesta = await fetch('/api/posiciones/ajustar-puntos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, equipoId, ajuste: cantidad, motivo: motivo.trim() }),
      });
      const resultado = await respuesta.json();
      // `fetch` no lanza con 4xx ni 5xx.
      if (!respuesta.ok || !resultado.ok) {
        avisos.error(motivoDelFallo(resultado, 'No pudimos aplicar el ajuste.'), enCurso);
        setEnviando(false);
        return;
      }
      avisos.exito(`Ajuste aplicado a ${nombreEquipo}.`, enCurso);
      setAjuste('');
      setMotivo('');
      setAbierto(false);
      router.refresh();
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        className={styles.botonSecundarioChico}
        onClick={() => setAbierto(true)}
      >
        {ajustePuntos === 0
          ? 'Ajustar puntos'
          : `Ajuste: ${ajustePuntos > 0 ? '+' : ''}${ajustePuntos}`}
      </button>
    );
  }

  return (
    <div className={styles.formularioChico}>
      {ajustePuntos !== 0 && (
        <p className={styles.avisoChico}>
          Acumulado: {ajustePuntos > 0 ? '+' : ''}
          {ajustePuntos} punto{Math.abs(ajustePuntos) === 1 ? '' : 's'}
          {ultimoAjusteMotivo && ` · último motivo: ${ultimoAjusteMotivo}`}
        </p>
      )}

      <label>
        Puntos a sumar o restar
        <input
          type="number"
          step={1}
          value={ajuste}
          onChange={(evento) => setAjuste(evento.target.value)}
          placeholder="-3"
          disabled={enviando}
          aria-label={`Puntos a sumar o restar a ${nombreEquipo}`}
        />
      </label>

      <label>
        Motivo
        <input
          type="text"
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder="Presentó un jugador no habilitado"
          disabled={enviando}
          aria-label={`Motivo del ajuste a ${nombreEquipo}`}
        />
      </label>

      <div className={styles.filaAcciones}>
        <button type="button" onClick={aplicar} disabled={!valido || enviando}>
          {enviando ? 'Aplicando…' : 'Aplicar ajuste'}
        </button>
        <button
          type="button"
          className={styles.botonSecundarioChico}
          onClick={() => setAbierto(false)}
          disabled={enviando}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
