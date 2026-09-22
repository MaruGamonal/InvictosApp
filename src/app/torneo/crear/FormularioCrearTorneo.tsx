'use client';
import { subirArchivo, validarArchivo, TIPOS_IMAGEN } from '@/lib/subidaCliente';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ProvinciaListada } from '@/services/descubrimiento/listarCiudades';
import { BuscadorCiudad } from '@/components/BuscadorCiudad';
import { BuscadorDireccionTorneo } from '@/components/BuscadorDireccionTorneo';
import { Escudo } from '@/components/Escudo';
import { useAvisos } from '@/components/avisos/Avisos';
import styles from '../../ingresar/pagina.module.css';

interface Props {
  provincias: ProvinciaListada[];
}

const MODALIDADES = [
  { valor: 'f5', etiqueta: 'Fútbol 5' },
  { valor: 'f7', etiqueta: 'Fútbol 7' },
  { valor: 'f8', etiqueta: 'Fútbol 8' },
  { valor: 'f9', etiqueta: 'Fútbol 9' },
  { valor: 'f11', etiqueta: 'Fútbol 11' },
];

const CATEGORIAS_GENERO = [
  { valor: 'male', etiqueta: 'Masculino' },
  { valor: 'female', etiqueta: 'Femenino' },
  { valor: 'mixed', etiqueta: 'Mixto' },
];

const FORMATOS = [
  { valor: 'league', etiqueta: 'Liga' },
  { valor: 'knockout', etiqueta: 'Eliminación directa' },
  { valor: 'groups_knockout', etiqueta: 'Grupos + eliminatoria' },
];

/**
 * UC-16 — cliente de `POST /api/torneos`. Colapsa nombre/modalidad/
 * categoría/formato/costos en un solo formulario en vez del primer
 * tramo del wizard del prototipo — pero reglamento y publicar sí
 * siguen siendo pasos propios después de crear (`/crear/reglamento` →
 * `/crear/publicar`), tal como el prototipo los muestra. El formato en
 * sí (fases/grupos) queda para la gestión, porque necesita las
 * inscripciones aprobadas que un torneo recién creado todavía no tiene.
 */
export function FormularioCrearTorneo({ provincias }: Props) {
  const [nombre, setNombre] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [categoriaGenero, setCategoriaGenero] = useState('');
  const [formato, setFormato] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [direccion, setDireccion] = useState('');
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [cupoEquipos, setCupoEquipos] = useState('');
  const [fechaInicioEstimada, setFechaInicioEstimada] = useState('');
  const [fechaFinEstimada, setFechaFinEstimada] = useState('');
  const [costoInscripcion, setCostoInscripcion] = useState('');
  const [costoPlanilla, setCostoPlanilla] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avisos = useAvisos();
  const [imagenFallida, setImagenFallida] = useState<{ torneoId: string; mensaje: string } | null>(
    null,
  );

  const inputImagenRef = useRef<HTMLInputElement>(null);
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
  const [previsualizacionImagen, setPrevisualizacionImagen] = useState<string | null>(null);

  function elegirImagen(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    // Al elegirlo, no al enviar el formulario: enterarse de que la
    // imagen no sirve después de completar todo y crear la entidad deja
    // a la persona sin nada que hacer en esa pantalla.
    const problema = validarArchivo(archivo, TIPOS_IMAGEN);
    if (problema) {
      setError(problema);
      return;
    }

    setError(null);
    setArchivoImagen(archivo);
    setPrevisualizacionImagen(URL.createObjectURL(archivo));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/torneos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          modalidad,
          categoriaGenero,
          formato,
          ciudadId,
          direccion: direccion || undefined,
          latitud: coordenadas?.lat,
          longitud: coordenadas?.lng,
          descripcion: descripcion || undefined,
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
        if (cuerpo?.error?.codigo === 'CUENTA_NO_CONFIRMADA') {
          // Por aviso: insertarlo entre los campos movía de lugar todo
          // lo que venía después, con el formulario ya completo.
          avisos.cuentaNoConfirmada('Confirmá tu cuenta para crear un torneo — revisá tu correo.');
        } else {
          setError(cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.');
        }
        setEnviando(false);
        return;
      }

      const torneoId = cuerpo.data.id;

      if (archivoImagen) {
        // Un `fetch` pelado no lanza con un 4xx/5xx: el rechazo del
        // servidor se perdía y el torneo quedaba sin imagen en silencio.
        const datosFormulario = new FormData();
        datosFormulario.append('torneoId', torneoId);
        datosFormulario.append('archivo', archivoImagen);
        const subida = await subirArchivo('/api/torneos/imagen', datosFormulario);
        if (!subida.ok) {
          setImagenFallida({ torneoId, mensaje: subida.mensaje });
          setEnviando(false);
          return;
        }
      }

      window.location.assign(`/torneo/${torneoId}/crear/reglamento`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  // El torneo ya existe: volver a mostrar el formulario invitaría a
  // crearlo de nuevo. Se explica qué pasó y se sigue con el alta.
  if (imagenFallida) {
    return (
      <div className={styles.tarjeta}>
        <h1 className={`fuente-display ${styles.titulo}`}>Torneo creado</h1>
        <p className={styles.error}>{imagenFallida.mensaje}</p>
        <p className={styles.texto}>
          El torneo quedó creado sin imagen. Podés subirla cuando quieras desde Configuración.
        </p>
        <a className={styles.boton} href={`/torneo/${imagenFallida.torneoId}/crear/reglamento`}>
          Seguir con el reglamento
        </a>
      </div>
    );
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Crear torneo</h1>
      <p className={styles.texto}>Nace en borrador. Lo publicás cuando esté listo.</p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.campo}>
        <label htmlFor="imagen">Imagen del torneo (opcional)</label>
        <div className={styles.filaEscudo}>
          <button
            type="button"
            className={styles.botonEscudo}
            onClick={() => inputImagenRef.current?.click()}
            aria-label="Elegir imagen del torneo"
          >
            <Escudo src={previsualizacionImagen} nombre={nombre || 'Torneo'} tamano={64} />
          </button>
          <input
            id="imagen"
            ref={inputImagenRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={elegirImagen}
          />
          <button
            type="button"
            className={styles.enlaceEscudo}
            onClick={() => inputImagenRef.current?.click()}
          >
            {archivoImagen ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="nombre">Nombre del torneo</label>
        <input
          id="nombre"
          type="text"
          required
          placeholder="Copa Otoño F5"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="modalidad">Modalidad</label>
        <select
          id="modalidad"
          required
          value={modalidad}
          onChange={(evento) => setModalidad(evento.target.value)}
        >
          <option value="" disabled>
            Elegí una modalidad
          </option>
          {MODALIDADES.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.campo}>
        <label htmlFor="categoriaGenero">Categoría</label>
        <select
          id="categoriaGenero"
          required
          value={categoriaGenero}
          onChange={(evento) => setCategoriaGenero(evento.target.value)}
        >
          <option value="" disabled>
            Elegí una categoría
          </option>
          {CATEGORIAS_GENERO.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.campo}>
        <label htmlFor="ciudadId">Ciudad</label>
        <BuscadorCiudad
          id="ciudadId"
          provincias={provincias}
          value={ciudadId}
          onChange={setCiudadId}
          required
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="direccion">Dirección (opcional)</label>
        <BuscadorDireccionTorneo
          id="direccion"
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
        <span className={styles.ayuda}>Elegila de la lista para que el mapa la ubique bien.</span>
      </div>

      <div className={styles.campo}>
        <label htmlFor="descripcion">Descripción (opcional)</label>
        <textarea
          id="descripcion"
          rows={4}
          placeholder="Contales de qué se trata el torneo: horarios, costo, cómo anotarse…"
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="formato">Formato</label>
        <select
          id="formato"
          required
          value={formato}
          onChange={(evento) => setFormato(evento.target.value)}
        >
          <option value="" disabled>
            Elegí un formato
          </option>
          {FORMATOS.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.campo}>
        <label htmlFor="cupoEquipos">Cupo máximo de equipos</label>
        <input
          id="cupoEquipos"
          type="number"
          required
          min={1}
          placeholder="16"
          value={cupoEquipos}
          onChange={(evento) => setCupoEquipos(evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="fechaInicioEstimada">Fecha estimada de inicio (opcional)</label>
        <input
          id="fechaInicioEstimada"
          type="date"
          value={fechaInicioEstimada}
          onChange={(evento) => setFechaInicioEstimada(evento.target.value)}
        />
        <span className={styles.ayuda}>
          Se puede ajustar después, pero hace falta cargarla para publicar el torneo.
        </span>
      </div>

      <div className={styles.campo}>
        <label htmlFor="fechaFinEstimada">Fecha estimada de fin (opcional)</label>
        <input
          id="fechaFinEstimada"
          type="date"
          value={fechaFinEstimada}
          onChange={(evento) => setFechaFinEstimada(evento.target.value)}
        />
        <span className={styles.ayuda}>
          Con las dos fechas cargadas, un torneo de hasta 3 días se trata como relámpago: los plazos
          se ajustan a esa duración en vez de a una fecha por semana.
        </span>
      </div>

      <fieldset className={styles.costos}>
        <legend>Costos (opcional)</legend>
        <div className={styles.filaCostos}>
          <div className={styles.campo}>
            <label htmlFor="costoInscripcion">Inscripción</label>
            <input
              id="costoInscripcion"
              type="number"
              min={0}
              step="0.01"
              placeholder="$0"
              value={costoInscripcion}
              onChange={(evento) => setCostoInscripcion(evento.target.value)}
            />
          </div>
          <div className={styles.campo}>
            <label htmlFor="costoPlanilla">Planilla / fecha</label>
            <input
              id="costoPlanilla"
              type="number"
              min={0}
              step="0.01"
              placeholder="$0"
              value={costoPlanilla}
              onChange={(evento) => setCostoPlanilla(evento.target.value)}
            />
          </div>
        </div>
        <span className={styles.ayuda}>
          Se muestran en la ficha pública. Sin cargar, el torneo aparece como sin costo.
        </span>
      </fieldset>

      <button type="submit" className={styles.boton} disabled={enviando}>
        {enviando ? 'Creando…' : 'Crear torneo'}
      </button>
    </form>
  );
}
