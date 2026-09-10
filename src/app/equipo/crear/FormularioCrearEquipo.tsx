'use client';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ProvinciaListada } from '@/services/descubrimiento/listarCiudades';
import { BuscadorCiudad } from '@/components/BuscadorCiudad';
import { Escudo } from '@/components/Escudo';
import styles from '../../ingresar/pagina.module.css';

interface Props {
  provincias: ProvinciaListada[];
}

const CATEGORIAS_GENERO = [
  { valor: 'male', etiqueta: 'Masculino' },
  { valor: 'female', etiqueta: 'Femenino' },
  { valor: 'mixed', etiqueta: 'Mixto' },
];

/**
 * UC-10 — cliente de `POST /api/equipos`. `categoriaGenero` no tiene
 * default (D-81). El escudo se elige acá pero se sube después de crear
 * el equipo (`POST /api/equipos/escudo` necesita el `equipoId`, que no
 * existe todavía) — si la subida falla, el equipo ya quedó creado, así
 * que igual se entra a su ficha; el escudo se puede reintentar desde
 * "Gestionar equipo".
 */
export function FormularioCrearEquipo({ provincias }: Props) {
  const [nombre, setNombre] = useState('');
  const [categoriaGenero, setCategoriaGenero] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputEscudoRef = useRef<HTMLInputElement>(null);
  const [archivoEscudo, setArchivoEscudo] = useState<File | null>(null);
  const [previsualizacionEscudo, setPrevisualizacionEscudo] = useState<string | null>(null);

  function elegirEscudo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setArchivoEscudo(archivo);
    setPrevisualizacionEscudo(URL.createObjectURL(archivo));
  }

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

      const equipoId = cuerpo.data.id;

      if (archivoEscudo) {
        try {
          const datosFormulario = new FormData();
          datosFormulario.append('equipoId', equipoId);
          datosFormulario.append('archivo', archivoEscudo);
          await fetch('/api/equipos/escudo', { method: 'POST', body: datosFormulario });
        } catch {
          // El equipo ya se creó — el escudo se puede volver a intentar desde "Gestionar equipo".
        }
      }

      window.location.assign(`/equipo/${equipoId}`);
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
        <label htmlFor="escudo">Escudo (opcional)</label>
        <div className={styles.filaEscudo}>
          <button
            type="button"
            className={styles.botonEscudo}
            onClick={() => inputEscudoRef.current?.click()}
            aria-label="Elegir escudo del equipo"
          >
            <Escudo src={previsualizacionEscudo} nombre={nombre || 'Equipo'} tamano={64} />
          </button>
          <input
            id="escudo"
            ref={inputEscudoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={elegirEscudo}
          />
          <button
            type="button"
            className={styles.enlaceEscudo}
            onClick={() => inputEscudoRef.current?.click()}
          >
            {archivoEscudo ? 'Cambiar escudo' : 'Elegir escudo'}
          </button>
        </div>
      </div>

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
        <BuscadorCiudad
          id="ciudadId"
          provincias={provincias}
          value={ciudadId}
          onChange={setCiudadId}
        />
      </div>

      <button type="submit" className={styles.boton} disabled={enviando}>
        {enviando ? 'Creando…' : 'Crear equipo'}
      </button>
    </form>
  );
}
