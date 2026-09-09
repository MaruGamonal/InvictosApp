'use client';

import { useState, type FormEvent } from 'react';
import type { ProvinciaListada } from '@/services/descubrimiento/listarCiudades';
import styles from '../../ingresar/pagina.module.css';

interface Props {
  provincias: ProvinciaListada[];
}

const CATEGORIAS_GENERO = [
  { valor: 'male', etiqueta: 'Masculino' },
  { valor: 'female', etiqueta: 'Femenino' },
  { valor: 'mixed', etiqueta: 'Mixto' },
];

/** UC-10 — cliente de `POST /api/equipos`. `categoriaGenero` no tiene default (D-81). */
export function FormularioCrearEquipo({ provincias }: Props) {
  const [nombre, setNombre] = useState('');
  const [categoriaGenero, setCategoriaGenero] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          categoriaGenero,
          ciudadId: ciudadId || undefined,
        }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.');
        setEnviando(false);
        return;
      }

      window.location.assign(`/equipo/${cuerpo.data.id}`);
    } catch {
      setError('No pudimos conectar. Revisá tu conexión e intentá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Crear equipo</h1>
      <p className={styles.texto}>Quedás como Capitán. Después sumás jugadores desde el plantel.</p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.campo}>
        <label htmlFor="nombre">Nombre del equipo</label>
        <input
          id="nombre"
          type="text"
          required
          placeholder="Los Pibes del Fondo"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
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
        <label htmlFor="ciudadId">Ciudad (opcional)</label>
        <select id="ciudadId" value={ciudadId} onChange={(evento) => setCiudadId(evento.target.value)}>
          <option value="">Sin definir</option>
          {provincias.map((provincia) => (
            <optgroup key={provincia.id} label={provincia.nombre}>
              {provincia.ciudades.map((ciudad) => (
                <option key={ciudad.id} value={ciudad.id}>
                  {ciudad.nombre}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <button type="submit" className={styles.boton} disabled={enviando}>
        {enviando ? 'Creando…' : 'Crear equipo'}
      </button>
    </form>
  );
}
