'use client';

import { useState, type FormEvent } from 'react';
import type { ProvinciaListada } from '@/services/descubrimiento/listarCiudades';
import { BuscadorCiudad } from '@/components/BuscadorCiudad';
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
 * UC-16 — cliente de `POST /api/torneos`. Un solo formulario en vez del
 * wizard de varias pantallas del prototipo (nombre → formato →
 * reglamento → publicar): el torneo nace en `draft` con los defaults
 * del amateur (`06`) y el resto de esos pasos (reglamento, publicar) se
 * hacen después, desde la ficha del torneo.
 */
export function FormularioCrearTorneo({ provincias }: Props) {
  const [nombre, setNombre] = useState('');
  const [modalidad, setModalidad] = useState('');
  const [categoriaGenero, setCategoriaGenero] = useState('');
  const [formato, setFormato] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cupoEquipos, setCupoEquipos] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          cupoEquipos: Number(cupoEquipos),
        }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.');
        setEnviando(false);
        return;
      }

      window.location.assign(`/torneo/${cuerpo.data.id}`);
    } catch {
      setError('No pudimos conectar. Revisá tu conexión e intentá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Crear torneo</h1>
      <p className={styles.texto}>Nace en borrador. Lo publicás cuando esté listo.</p>

      {error && <p className={styles.error}>{error}</p>}

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
        <input
          id="direccion"
          type="text"
          placeholder="La sede física — distinta de la ciudad"
          value={direccion}
          onChange={(evento) => setDireccion(evento.target.value)}
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

      <button type="submit" className={styles.boton} disabled={enviando}>
        {enviando ? 'Creando…' : 'Crear torneo'}
      </button>
    </form>
  );
}
