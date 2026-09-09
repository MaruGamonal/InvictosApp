'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BuscadorCiudad, type ProvinciaConCiudades } from '@/components/BuscadorCiudad';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  nombre: string;
  categoriaGenero: string;
  modalidadHabitual: string | null;
  ciudadId: string;
  provincias: ProvinciaConCiudades[];
}

const CATEGORIAS_GENERO = [
  { valor: 'male', etiqueta: 'Masculino' },
  { valor: 'female', etiqueta: 'Femenino' },
  { valor: 'mixed', etiqueta: 'Mixto' },
];

const MODALIDADES = [
  { valor: '', etiqueta: 'Sin definir' },
  { valor: 'f5', etiqueta: 'Fútbol 5' },
  { valor: 'f7', etiqueta: 'Fútbol 7' },
  { valor: 'f8', etiqueta: 'Fútbol 8' },
  { valor: 'f9', etiqueta: 'Fútbol 9' },
  { valor: 'f11', etiqueta: 'Fútbol 11' },
];

/** UC-10 — cliente de `POST /api/equipos/actualizar`. Capitán o Delegado. */
export function FormularioEditarEquipo({
  equipoId,
  nombre: nombreInicial,
  categoriaGenero: categoriaGeneroInicial,
  modalidadHabitual: modalidadInicial,
  ciudadId: ciudadIdInicial,
  provincias,
}: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [categoriaGenero, setCategoriaGenero] = useState(categoriaGeneroInicial);
  const [modalidadHabitual, setModalidadHabitual] = useState(modalidadInicial ?? '');
  const [ciudadId, setCiudadId] = useState(ciudadIdInicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setGuardado(false);

    try {
      const respuesta = await fetch('/api/equipos/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipoId,
          nombre,
          categoriaGenero,
          modalidadHabitual: modalidadHabitual || undefined,
          ciudadId: ciudadId || undefined,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo guardar. Probá de nuevo.');
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

      <input
        type="text"
        required
        placeholder="Nombre del equipo"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
      />

      <select
        value={categoriaGenero}
        onChange={(evento) => setCategoriaGenero(evento.target.value)}
      >
        {CATEGORIAS_GENERO.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>

      <select
        value={modalidadHabitual}
        onChange={(evento) => setModalidadHabitual(evento.target.value)}
      >
        {MODALIDADES.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>

      <BuscadorCiudad provincias={provincias} value={ciudadId} onChange={setCiudadId} />

      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar datos del equipo'}
      </button>
    </form>
  );
}
