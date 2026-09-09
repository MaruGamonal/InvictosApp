'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

export interface FormularioDefinirFormatoProps {
  torneoId: string;
  formatoElegido: 'league' | 'knockout' | 'groups_knockout';
}

const ETIQUETA_FORMATO: Record<string, string> = {
  league: 'Liga (todos contra todos)',
  knockout: 'Eliminación directa',
  groups_knockout: 'Grupos + eliminatoria',
};

/**
 * UC-17 — Crea las fases y grupos del torneo, con el `formato` ya
 * elegido al crearlo (`torneo/crear`) — acá solo se completan los
 * parámetros que ese formato necesita. Sin esto no hay fixture posible:
 * `generarFixture` busca `fase`/`grupo`, y ninguno existe todavía.
 */
export function FormularioDefinirFormato({
  torneoId,
  formatoElegido,
}: FormularioDefinirFormatoProps) {
  const router = useRouter();
  const [idaYVuelta, setIdaYVuelta] = useState(false);
  const [cantidadZonas, setCantidadZonas] = useState(2);
  const [clasificadosPorZona, setClasificadosPorZona] = useState(2);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const body =
        formatoElegido === 'groups_knockout'
          ? { torneoId, formato: formatoElegido, idaYVuelta, cantidadZonas, clasificadosPorZona }
          : { torneoId, formato: formatoElegido, idaYVuelta };

      const respuesta = await fetch('/api/torneos/definir-formato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos definir el formato.');
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formularioChico} onSubmit={enviar}>
      <p className={styles.avisoChico}>{ETIQUETA_FORMATO[formatoElegido]}</p>
      {error && <p className={styles.errorChico}>{error}</p>}

      <label className={styles.filaCheckbox}>
        <input
          type="checkbox"
          checked={idaYVuelta}
          onChange={(evento) => setIdaYVuelta(evento.target.checked)}
        />
        Ida y vuelta
      </label>

      {formatoElegido === 'groups_knockout' && (
        <>
          <label>
            Cantidad de zonas
            <input
              type="number"
              min={2}
              value={cantidadZonas}
              onChange={(evento) => setCantidadZonas(Number(evento.target.value))}
            />
          </label>
          <label>
            Clasifican por zona
            <input
              type="number"
              min={1}
              value={clasificadosPorZona}
              onChange={(evento) => setClasificadosPorZona(Number(evento.target.value))}
            />
          </label>
        </>
      )}

      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Confirmar formato'}
      </button>
    </form>
  );
}
