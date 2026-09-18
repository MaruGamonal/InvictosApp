'use client';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ProvinciaListada } from '@/services/descubrimiento/listarCiudades';
import { BuscadorCiudad } from '@/components/BuscadorCiudad';
import { Escudo } from '@/components/Escudo';
import styles from '../../../ingresar/pagina.module.css';

interface Props {
  provincias: ProvinciaListada[];
}

/**
 * UC-06 — Cliente de `POST /api/organizaciones/crear`. Mismo criterio
 * que `FormularioCrearTorneo`: crea primero, sube el logo después
 * (`/api/organizaciones/logo`) para no bloquear la creación si la
 * subida falla.
 */
export function FormularioCrearOrganizacion({ provincias }: Props) {
  const [nombre, setNombre] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [archivoLogo, setArchivoLogo] = useState<File | null>(null);
  const [previsualizacionLogo, setPrevisualizacionLogo] = useState<string | null>(null);

  function elegirLogo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setArchivoLogo(archivo);
    setPrevisualizacionLogo(URL.createObjectURL(archivo));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/organizaciones/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          ciudadId: ciudadId || undefined,
          descripcion: descripcion || undefined,
        }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.');
        setEnviando(false);
        return;
      }

      const organizacionId = cuerpo.data.id;

      if (archivoLogo) {
        try {
          const datosFormulario = new FormData();
          datosFormulario.append('organizacionId', organizacionId);
          datosFormulario.append('archivo', archivoLogo);
          await fetch('/api/organizaciones/logo', { method: 'POST', body: datosFormulario });
        } catch {
          // La organización ya se creó — el logo se puede subir después desde Perfil público.
        }
      }

      window.location.assign('/organizador/gestionar');
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Crear organización</h1>
      <p className={styles.texto}>Quién organiza tus torneos — la podés editar después.</p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.campo}>
        <div className={styles.filaEscudo}>
          <button
            type="button"
            className={styles.botonEscudo}
            onClick={() => inputLogoRef.current?.click()}
            aria-label="Elegir logo de la organización"
          >
            <Escudo src={previsualizacionLogo} nombre={nombre || 'Organización'} tamano={64} />
          </button>
          <input
            id="logo"
            ref={inputLogoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={elegirLogo}
          />
          <button
            type="button"
            className={styles.enlaceEscudo}
            onClick={() => inputLogoRef.current?.click()}
          >
            {archivoLogo ? 'Cambiar logo' : 'Subir logo'}
          </button>
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="nombre">Nombre de la organización</label>
        <input
          id="nombre"
          type="text"
          required
          placeholder="Liga Invicta Palermo"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
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

      <div className={styles.campo}>
        <label htmlFor="descripcion">Descripción (opcional)</label>
        <textarea
          id="descripcion"
          rows={4}
          placeholder="Contales quién organiza: trayectoria, qué tipo de torneos armás…"
          value={descripcion}
          onChange={(evento) => setDescripcion(evento.target.value)}
        />
      </div>

      <button type="submit" className={styles.boton} disabled={enviando || !nombre.trim()}>
        {enviando ? 'Creando…' : 'Crear organización'}
      </button>
    </form>
  );
}
