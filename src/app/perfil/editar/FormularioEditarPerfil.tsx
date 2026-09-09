'use client';

import { useState, type FormEvent } from 'react';
import type { MiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { BuscadorCiudad, type ProvinciaConCiudades } from '@/components/BuscadorCiudad';
import styles from '../../ingresar/pagina.module.css';

interface Props {
  perfil: MiPerfil;
  provincias: ProvinciaConCiudades[];
}

const POSICIONES = [
  { valor: 'unspecified', etiqueta: 'Sin especificar' },
  { valor: 'goalkeeper', etiqueta: 'Arquero' },
  { valor: 'defender', etiqueta: 'Defensor' },
  { valor: 'midfielder', etiqueta: 'Mediocampista' },
  { valor: 'forward', etiqueta: 'Delantero' },
];

/** UC-02/UC-04 — cliente de `POST /api/mi-perfil`. Todo opcional (D-52): nada acá bloquea nada. */
export function FormularioEditarPerfil({ perfil, provincias }: Props) {
  const [nombreVisible, setNombreVisible] = useState(perfil.nombreVisible);
  const [posicion, setPosicion] = useState(perfil.posicion ?? 'unspecified');
  const [ciudadId, setCiudadId] = useState(perfil.ciudadId ?? '');
  const [visibilidad, setVisibilidad] = useState(perfil.visibilidad);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setGuardado(false);

    try {
      const respuesta = await fetch('/api/mi-perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreVisible,
          posicion,
          ciudadId: ciudadId || undefined,
          visibilidad,
        }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.');
        return;
      }
      setGuardado(true);
    } catch {
      setError('No pudimos conectar. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Editar perfil</h1>
      <p className={styles.texto}>Todo acá es opcional — nada de esto te bloquea nada.</p>

      {error && <p className={styles.error}>{error}</p>}
      {guardado && !error && <p className={styles.ayuda}>Guardado.</p>}

      <div className={styles.campo}>
        <label htmlFor="nombreVisible">Nombre visible</label>
        <input
          id="nombreVisible"
          type="text"
          required
          value={nombreVisible}
          onChange={(evento) => setNombreVisible(evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="posicion">Posición</label>
        <select
          id="posicion"
          value={posicion}
          onChange={(evento) => setPosicion(evento.target.value)}
        >
          {POSICIONES.map((opcion) => (
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
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="visibilidad">Visibilidad del perfil</label>
        <select
          id="visibilidad"
          value={visibilidad}
          onChange={(evento) => setVisibilidad(evento.target.value as 'public' | 'restricted')}
        >
          <option value="public">Público</option>
          <option value="restricted">Restringido</option>
        </select>
        <span className={styles.ayuda}>
          Restringido oculta tu foto, posición y ciudad en los planteles donde participás — tu
          participación en sí nunca se oculta.
        </span>
      </div>

      <button type="submit" className={styles.boton} disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
