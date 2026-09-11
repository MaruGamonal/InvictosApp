'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EstadoVacio } from '@/components/EstadoVacio';
import styles from './pagina.module.css';

export interface PartidoProgramable {
  id: string;
  numeroFecha: number;
  equipoLocalNombre: string;
  equipoVisitanteNombre: string;
  estado: string;
  fechaHoraProgramada: string | null;
  sedeNombre: string | null;
}

export interface PanelProgramarPartidosProps {
  partidos: PartidoProgramable[];
  ciudadId: string;
}

function formatearFecha(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function aInputDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

/** UC-30 — Programar o reprogramar cada partido: fecha/hora obligatoria, sede opcional. */
export function PanelProgramarPartidos({ partidos, ciudadId }: PanelProgramarPartidosProps) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [fechaHora, setFechaHora] = useState('');
  const [sedeNombre, setSedeNombre] = useState('');
  const [sedeDireccion, setSedeDireccion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function empezarEdicion(partido: PartidoProgramable) {
    setEditando(partido.id);
    setFechaHora(aInputDatetimeLocal(partido.fechaHoraProgramada));
    setSedeNombre('');
    setSedeDireccion('');
    setError(null);
  }

  async function guardar(partidoId: string) {
    if (!fechaHora) return;
    if ((sedeNombre.trim() === '') !== (sedeDireccion.trim() === '')) {
      setError('Para agregar una sede hacen falta el nombre y la dirección, los dos.');
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/fixture/programar-partido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partidoId,
          fechaHoraProgramada: new Date(fechaHora).toISOString(),
          sedeNueva:
            sedeNombre.trim() && sedeDireccion.trim()
              ? { nombre: sedeNombre.trim(), direccion: sedeDireccion.trim(), ciudadId }
              : undefined,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo programar el partido.');
        return;
      }
      setEditando(null);
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (partidos.length === 0) {
    return <EstadoVacio mensaje="Todavía no hay partidos generados." />;
  }

  return (
    <div className={styles.lista}>
      {error && <p className={styles.errorChico}>{error}</p>}
      {partidos.map((partido) => (
        <div key={partido.id} className={styles.filaPartido}>
          <span className={styles.nombresPartido}>
            Fecha {partido.numeroFecha} — {partido.equipoLocalNombre} vs{' '}
            {partido.equipoVisitanteNombre}
          </span>
          <span className={styles.rolIntegrante}>
            {formatearFecha(partido.fechaHoraProgramada) ?? 'Sin programar'}
            {partido.sedeNombre && ` · ${partido.sedeNombre}`}
          </span>

          {partido.estado === 'played' ? null : editando === partido.id ? (
            <div className={styles.filaAccion}>
              <input
                type="datetime-local"
                value={fechaHora}
                onChange={(evento) => setFechaHora(evento.target.value)}
                disabled={enviando}
              />
              <input
                type="text"
                placeholder="Sede (opcional)"
                value={sedeNombre}
                onChange={(evento) => setSedeNombre(evento.target.value)}
                disabled={enviando}
              />
              <input
                type="text"
                placeholder="Dirección"
                value={sedeDireccion}
                onChange={(evento) => setSedeDireccion(evento.target.value)}
                disabled={enviando}
              />
              <button
                type="button"
                onClick={() => guardar(partido.id)}
                disabled={enviando || !fechaHora}
              >
                {enviando ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                className={styles.botonSecundarioChico}
                onClick={() => setEditando(null)}
                disabled={enviando}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.botonSecundarioChico}
              onClick={() => empezarEdicion(partido)}
            >
              {partido.fechaHoraProgramada ? 'Reprogramar' : 'Programar'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
