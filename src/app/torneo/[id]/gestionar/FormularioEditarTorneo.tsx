'use client';
import { subirArchivo, validarArchivo, TIPOS_IMAGEN } from '@/lib/subidaCliente';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BuscadorDireccionTorneo } from '@/components/BuscadorDireccionTorneo';
import { Escudo } from '@/components/Escudo';
import styles from './pagina.module.css';

interface Props {
  torneoId: string;
  nombre: string;
  descripcion: string | null;
  imagenUrl: string | null;
  direccion: string | null;
  costoInscripcion: number | null;
  costoPlanilla: number | null;
  cupoEquipos: number;
  fechaInicioEstimada: string | null;
  fechaFinEstimada: string | null;
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
  imagenUrl: imagenUrlInicial,
  direccion: direccionInicial,
  costoInscripcion: costoInscripcionInicial,
  costoPlanilla: costoPlanillaInicial,
  cupoEquipos: cupoEquiposInicial,
  fechaInicioEstimada: fechaInicioInicial,
  fechaFinEstimada: fechaFinInicial,
}: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [descripcion, setDescripcion] = useState(descripcionInicial ?? '');
  const [direccion, setDireccion] = useState(direccionInicial ?? '');

  const inputImagenRef = useRef<HTMLInputElement>(null);
  const [imagenUrl, setImagenUrl] = useState(imagenUrlInicial);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  async function subirImagen(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    const problema = validarArchivo(archivo, TIPOS_IMAGEN);
    if (problema) {
      setErrorImagen(problema);
      return;
    }

    setSubiendoImagen(true);
    setErrorImagen(null);
    const datosFormulario = new FormData();
    datosFormulario.append('torneoId', torneoId);
    datosFormulario.append('archivo', archivo);

    const resultado = await subirArchivo('/api/torneos/imagen', datosFormulario);
    setSubiendoImagen(false);
    if (!resultado.ok) {
      setErrorImagen(resultado.mensaje);
      return;
    }
    setImagenUrl(resultado.data.imagenUrl ?? null);
    router.refresh();
  }

  async function quitarImagen() {
    setSubiendoImagen(true);
    setErrorImagen(null);
    try {
      const respuesta = await fetch('/api/torneos/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, imagenUrl: null }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setErrorImagen(cuerpo?.error?.mensaje ?? 'No se pudo quitar la imagen. Probá de nuevo.');
        return;
      }
      setImagenUrl(null);
      router.refresh();
    } catch {
      setErrorImagen('No pudimos conectar. Probá de nuevo.');
    } finally {
      setSubiendoImagen(false);
    }
  }
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
  const [fechaFinEstimada, setFechaFinEstimada] = useState(
    fechaFinInicial ? fechaFinInicial.slice(0, 10) : '',
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
          fechaFinEstimada: fechaFinEstimada ? new Date(fechaFinEstimada).toISOString() : undefined,
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
      <div className={styles.filaImagen}>
        <button
          type="button"
          className={styles.botonImagen}
          onClick={() => inputImagenRef.current?.click()}
          disabled={subiendoImagen}
          aria-label="Cambiar imagen del torneo"
        >
          <Escudo src={imagenUrl} nombre={nombre} tamano={64} />
        </button>
        <input
          ref={inputImagenRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={subirImagen}
        />
        <div>
          <div className={styles.accionesImagen}>
            <button
              type="button"
              className={styles.enlaceImagen}
              onClick={() => inputImagenRef.current?.click()}
              disabled={subiendoImagen}
            >
              {subiendoImagen ? 'Subiendo…' : imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
            </button>
            {imagenUrl && (
              <button
                type="button"
                className={styles.enlaceImagenQuitar}
                onClick={quitarImagen}
                disabled={subiendoImagen}
              >
                Quitar imagen
              </button>
            )}
          </div>
          {errorImagen && <p className={styles.errorChico}>{errorImagen}</p>}
        </div>
      </div>
      <span className={styles.avisoSinNotificar}>
        Imagen opcional del torneo (JPG, PNG o WEBP). Sin cargar, se usa el logo de la organización.
      </span>

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
        Fecha de fin
        <input
          type="date"
          value={fechaFinEstimada}
          onChange={(evento) => setFechaFinEstimada(evento.target.value)}
        />
      </label>
      <span className={styles.avisoSinNotificar}>
        Este cambio no notifica. Con las dos fechas cargadas, un torneo de hasta 3 días se trata
        como relámpago: los plazos de confirmación se cierran cuando termina, no a las 72 horas.
      </span>

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

      {/*
        Junto al botón y no arriba del formulario: este formulario es
        largo, el botón queda al final, y una confirmación a ciento
        cincuenta líneas de distancia no se ve — reportado en vivo como
        que guardar no daba ninguna señal.
      */}
      {error && <p className={styles.errorChico}>{error}</p>}
      {guardado && !error && (
        <p className={styles.avisoChico} role="status">
          Guardado.
        </p>
      )}
      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
