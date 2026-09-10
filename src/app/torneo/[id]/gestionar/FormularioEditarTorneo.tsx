'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BuscadorDireccionTorneo } from '@/components/BuscadorDireccionTorneo';
import styles from './pagina.module.css';

interface Props {
  torneoId: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  costoInscripcion: number | null;
  costoPlanilla: number | null;
  cupoEquipos: number;
  fechaInicioEstimada: string | null;
}

/**
 * UC-19 — cliente de `POST /api/torneos/actualizar`. De los campos que
 * toca (`06`, D-22b), fecha de inicio, dirección y cupo notifican a
 * inscriptos y seguidores al guardarse en un torneo ya publicado;
 * descripción y costos no — se lo marca en cada campo para que quede
 * claro antes de guardar, no después.
 */
export function FormularioEditarTorneo({
  torneoId,
  nombre: nombreInicial,
  descripcion: descripcionInicial,
  direccion: direccionInicial,
  costoInscripcion: costoInscripcionInicial,
  costoPlanilla: costoPlanillaInicial,
  cupoEquipos: cupoEquiposInicial,
  fechaInicioEstimada: fechaInicioInicial,
}: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [descripcion, setDescripcion] = useState(descripcionInicial ?? '');
  const [direccion, setDireccion] = useState(direccionInicial ?? '');
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null);
  const [costoInscripcion, setCostoInscripcion] = useState(
    costoInscripcionInicial != null ? String(costoInscripcionInicial) : '',
  );
  const [costoPlanilla, setCostoPlanilla] = useState(
    costoPlanillaInicial != null ? String(costoPlanillaInicial) : '',
  );
  const [cupoEquipos, setCupoEquipos] = useState(String(cupoEquiposInicial));
  const [fechaInicioEstimada, setFechaInicioEstimada] = useState(
    fechaInicioInicial ? fechaInicioInicial.slice(0, 10) : '',
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setGuardado(false);

    try {
      const respuesta = await fetch('/api/torneos/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoId,
          nombre,
          descripcion: descripcion || undefined,
          direccion: direccion || undefined,
          latitud: coordenadas?.lat,
          longitud: coordenadas?.lng,
          costoInscripcion: costoInscripcion ? Number(costoInscripcion) : undefined,
          costoPlanilla: costoPlanilla ? Number(costoPlanilla) : undefined,
          cupoEquipos: Number(cupoEquipos),
          fechaInicioEstimada: fechaInicioEstimada
            ? new Date(fechaInicioEstimada).toISOString()
            : undefined,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo guardar. Probá de nuevo.');
        setEnviando(false);
        return;
      }
      setGuardado(true);
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formularioChico} onSubmit={enviar}>
      {error && <p className={styles.errorChico}>{error}</p>}
      {guardado && !error && <p className={styles.avisoChico}>Guardado.</p>}

      <label>
        Nombre del torneo
        <input
          type="text"
          required
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </label>

      <label>
        Fecha de inicio
        <input
          type="date"
          value={fechaInicioEstimada}
          onChange={(evento) => setFechaInicioEstimada(evento.target.value)}
        />
      </label>
      <span className={styles.avisoNotifica}>Este cambio notifica a inscriptos y seguidores.</span>

      <label>
        Dirección
        <BuscadorDireccionTorneo
          id="direccionTorneoEditar"
          value={direccion}
          onChange={(ubicacion) => {
            setDireccion(ubicacion.direccion);
            setCoordenadas(
              ubicacion.latitud != null && ubicacion.longitud != null
                ? { lat: ubicacion.latitud, lng: ubicacion.longitud }
                : null,
            );
          }}
        />
      </label>
      <span className={styles.avisoNotifica}>Este cambio notifica a inscriptos y seguidores.</span>

      <label>
        Descripción
        <textarea
          rows={4}
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
        />
      </label>
      <span className={styles.avisoSinNotificar}>
        Este cambio no notifica: no es de los cinco relevantes (fecha, sede, formato, cupo,
        reglamento).
      </span>

      <div className={styles.filaCostos}>
        <label>
          Inscripción
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="$0"
            value={costoInscripcion}
            onChange={(evento) => setCostoInscripcion(evento.target.value)}
          />
        </label>
        <label>
          Planilla / fecha
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="$0"
            value={costoPlanilla}
            onChange={(evento) => setCostoPlanilla(evento.target.value)}
          />
        </label>
      </div>
      <span className={styles.avisoSinNotificar}>Este cambio no notifica.</span>

      <label>
        Cupo de equipos
        <input
          type="number"
          required
          min={1}
          value={cupoEquipos}
          onChange={(evento) => setCupoEquipos(evento.target.value)}
        />
      </label>
      <span className={styles.avisoNotifica}>Este cambio notifica a inscriptos y seguidores.</span>

      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
