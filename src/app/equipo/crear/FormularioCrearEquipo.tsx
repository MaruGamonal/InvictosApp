'use client';
import { subirArchivo, validarArchivo, TIPOS_IMAGEN } from '@/lib/subidaCliente';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ProvinciaListada } from '@/services/descubrimiento/listarCiudades';
import { BuscadorCiudad } from '@/components/BuscadorCiudad';
import { Escudo } from '@/components/Escudo';
import { useAvisos } from '@/components/avisos/Avisos';
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
 * existe todavía).
 *
 * Reportado en vivo — "la carga de imágenes falla y después no se ven en
 * el perfil": la subida iba con un `fetch` pelado dentro de un `try`, y
 * `fetch` no lanza con un 4xx/5xx, solo con una caída de red. Un rechazo
 * del servidor (bucket, permiso, tamaño) no entraba al `catch`, no se
 * mostraba en ningún lado y la pantalla redirigía igual: el equipo
 * quedaba sin escudo y nadie se enteraba de por qué.
 *
 * Ahora la subida pasa por `subirArchivo`, que sí distingue el rechazo,
 * y si falla no se redirige a ciegas: el equipo ya está creado, así que
 * la pantalla lo dice, ofrece entrar igual y explica dónde reintentar.
 */
export function FormularioCrearEquipo({ provincias }: Props) {
  const [nombre, setNombre] = useState('');
  const [categoriaGenero, setCategoriaGenero] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avisos = useAvisos();
  const [escudoFallido, setEscudoFallido] = useState<{ equipoId: string; mensaje: string } | null>(
    null,
  );
  const formularioValido = nombre.trim() !== '' && categoriaGenero !== '';

  const inputEscudoRef = useRef<HTMLInputElement>(null);
  const [archivoEscudo, setArchivoEscudo] = useState<File | null>(null);
  const [previsualizacionEscudo, setPrevisualizacionEscudo] = useState<string | null>(null);

  function elegirEscudo(evento: ChangeEvent<HTMLInputElement>) {
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
        if (cuerpo?.error?.codigo === 'CUENTA_NO_CONFIRMADA') {
          // Por aviso: insertarlo entre los campos movía de lugar todo
          // lo que venía después, con el formulario ya completo.
          avisos.cuentaNoConfirmada('Confirmá tu cuenta para crear un equipo — revisá tu correo.');
        } else {
          setError(cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.');
        }
        setEnviando(false);
        return;
      }

      const equipoId = cuerpo.data.id;

      if (archivoEscudo) {
        const datosFormulario = new FormData();
        datosFormulario.append('equipoId', equipoId);
        datosFormulario.append('archivo', archivoEscudo);
        const subida = await subirArchivo('/api/equipos/escudo', datosFormulario);
        if (!subida.ok) {
          setEscudoFallido({ equipoId, mensaje: subida.mensaje });
          setEnviando(false);
          return;
        }
      }

      window.location.assign(`/equipo/${equipoId}`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  // El equipo ya existe: volver a mostrar el formulario invitaría a
  // crearlo de nuevo. Se explica qué pasó y se sigue hacia adelante.
  if (escudoFallido) {
    return (
      <div className={styles.tarjeta}>
        <h1 className={`fuente-display ${styles.titulo}`}>Equipo creado</h1>
        <p className={styles.error}>{escudoFallido.mensaje}</p>
        <p className={styles.texto}>
          El equipo quedó creado sin escudo. Podés subirlo cuando quieras desde Gestionar equipo.
        </p>
        <a className={styles.boton} href={`/equipo/${escudoFallido.equipoId}`}>
          Ir al equipo
        </a>
      </div>
    );
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Crear equipo</h1>
      <p className={styles.texto}>Podés inscribirlo con el plantel vacío y sumar gente después.</p>

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
            {archivoEscudo ? 'Cambiar escudo' : 'Subir escudo'}
          </button>
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="nombre">Nombre del equipo</label>
        <input
          id="nombre"
          type="text"
          required
          placeholder="Ej: Los Pibes del Fondo"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="categoriaGenero">Categoría de género · obligatoria</label>
        <div id="categoriaGenero" className={styles.segmentado} role="radiogroup">
          {CATEGORIAS_GENERO.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={categoriaGenero === opcion.valor}
              className={`${styles.segmentoBoton} ${
                categoriaGenero === opcion.valor ? styles.segmentoBotonActivo : ''
              }`}
              onClick={() => setCategoriaGenero(opcion.valor)}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
        <p className={styles.ayudaAdvertencia}>
          Sin esto no se puede calcular tu ranking ni avisar una inscripción cruzada.
        </p>
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

      <button type="submit" className={styles.boton} disabled={enviando || !formularioValido}>
        {enviando ? 'Creando…' : 'Crear equipo'}
      </button>
    </form>
  );
}
