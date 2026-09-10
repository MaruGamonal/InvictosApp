'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import type { NotificacionListada } from '@/services/notificaciones/listarNotificaciones';
import { construirEnlaceNotificacion } from './_enlace';
import styles from './pagina.module.css';

interface Props {
  notificacionesIniciales: NotificacionListada[];
  cursorInicial: string | null;
}

function tiempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

/** Más nuevas primero — `listarNotificaciones` las trae ascendente (para cursor estable), se invierte acá. */
export function ListaNotificaciones({ notificacionesIniciales, cursorInicial }: Props) {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState(
    [...notificacionesIniciales].reverse(),
  );
  const [cursor, setCursor] = useState(cursorInicial);
  const [cargandoMas, setCargandoMas] = useState(false);

  async function marcarLeida(id: string) {
    setNotificaciones((actuales) =>
      actuales.map((n) => (n.id === id ? { ...n, estado: 'read' } : n)),
    );
    try {
      await fetch('/api/notificaciones/marcar-leida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificacionId: id }),
      });
    } catch {
      // Si falla, la próxima carga de la lista la vuelve a mostrar sin leer — no es grave.
    }
  }

  async function tocar(notificacion: NotificacionListada) {
    if (notificacion.estado !== 'read') marcarLeida(notificacion.id);
    const enlace = construirEnlaceNotificacion(
      notificacion.tipo,
      notificacion.entidadOrigenTipo,
      notificacion.entidadOrigenId,
    );
    if (enlace) router.push(enlace);
  }

  async function cargarMas() {
    if (!cursor) return;
    setCargandoMas(true);
    try {
      const respuesta = await fetch(`/api/notificaciones?cursor=${encodeURIComponent(cursor)}`);
      const cuerpo = await respuesta.json();
      if (respuesta.ok && cuerpo.ok) {
        setNotificaciones((actuales) => [...actuales, ...[...cuerpo.data.notificaciones].reverse()]);
        setCursor(cuerpo.data.cursorSiguiente);
      }
    } catch {
      // Sin conexión: el botón sigue disponible para reintentar.
    } finally {
      setCargandoMas(false);
    }
  }

  if (notificaciones.length === 0) {
    return <EstadoVacio mensaje="No tenés notificaciones por ahora." />;
  }

  return (
    <div className={styles.lista}>
      {notificaciones.map((notificacion) => {
        const etiqueta = obtenerEtiqueta('notificacion.tipo', notificacion.tipo).etiqueta;
        const enlace = construirEnlaceNotificacion(
          notificacion.tipo,
          notificacion.entidadOrigenTipo,
          notificacion.entidadOrigenId,
        );
        return (
          <button
            key={notificacion.id}
            type="button"
            className={
              notificacion.estado === 'read' ? styles.notificacionLeida : styles.notificacion
            }
            onClick={() => tocar(notificacion)}
          >
            <span className={styles.notificacionTexto}>{etiqueta}</span>
            <span className={styles.notificacionMeta}>
              {tiempoRelativo(notificacion.fechaGeneracion)}
              {enlace ? ' · Ver' : ''}
            </span>
          </button>
        );
      })}

      {cursor && (
        <button
          type="button"
          className={styles.botonSecundario}
          onClick={cargarMas}
          disabled={cargandoMas}
        >
          {cargandoMas ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </div>
  );
}
