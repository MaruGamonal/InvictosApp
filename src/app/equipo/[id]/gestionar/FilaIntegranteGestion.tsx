'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  perfilId: string;
  nombreVisible: string;
  rolEquipo: 'captain' | 'delegate' | 'player' | 'coach';
  esUnoMismo: boolean;
  esCapitanViewer: boolean;
}

const ACCIONES = [
  { valor: 'captain:asignar', etiqueta: 'Hacer capitán' },
  { valor: 'delegate:asignar', etiqueta: 'Hacer delegado' },
  { valor: 'delegate:quitar', etiqueta: 'Quitar como delegado' },
  { valor: 'coach:asignar', etiqueta: 'Hacer DT' },
  { valor: 'coach:quitar', etiqueta: 'Quitar como DT' },
  { valor: 'fuera', etiqueta: 'Quitar del plantel' },
];

/** Fila de plantel en la gestión del equipo: acciones de Capitán sobre otros, o "Dejar equipo" sobre uno mismo. */
export function FilaIntegranteGestion({
  equipoId,
  perfilId,
  nombreVisible,
  rolEquipo,
  esUnoMismo,
  esCapitanViewer,
}: Props) {
  const router = useRouter();
  const [accion, setAccion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function aplicar() {
    if (!accion || enviando) return;
    setEnviando(true);
    setError(null);

    try {
      const respuesta =
        accion === 'fuera'
          ? await fetch('/api/equipos/quitar-integrante', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ equipoId, perfilId }),
            })
          : await fetch('/api/equipos/cambiar-rol', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                equipoId,
                perfilId,
                rol: accion.split(':')[0],
                accion: accion.split(':')[1],
              }),
            });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo aplicar. Probá de nuevo.');
        setEnviando(false);
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  async function dejarEquipo() {
    if (enviando) return;
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/equipos/quitar-integrante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, perfilId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo dejar el equipo.');
        setEnviando(false);
        return;
      }
      router.push(`/equipo/${equipoId}`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <div className={styles.filaIntegrante}>
      <div className={styles.filaIntegranteCabecera}>
        <span className={styles.nombreIntegrante}>
          {nombreVisible}
          {esUnoMismo && ' (vos)'}
        </span>
        <span className={styles.rolIntegrante}>
          {obtenerEtiqueta('integranteEquipo.rolEquipo', rolEquipo).etiqueta}
        </span>
      </div>

      {error && <p className={styles.errorChico}>{error}</p>}

      {esUnoMismo ? (
        <button
          type="button"
          className={styles.botonPeligroChico}
          onClick={dejarEquipo}
          disabled={enviando}
        >
          {enviando ? 'Saliendo…' : 'Dejar equipo'}
        </button>
      ) : (
        esCapitanViewer && (
          <div className={styles.filaAccion}>
            <select value={accion} onChange={(evento) => setAccion(evento.target.value)}>
              <option value="">Elegir acción…</option>
              {ACCIONES.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
            <button type="button" onClick={aplicar} disabled={!accion || enviando}>
              {enviando ? 'Aplicando…' : 'Aplicar'}
            </button>
          </div>
        )
      )}
    </div>
  );
}
