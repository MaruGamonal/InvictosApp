'use client';
import { subirArchivo, validarArchivo, TIPOS_IMAGEN } from '@/lib/subidaCliente';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { BuscadorCiudad, type ProvinciaConCiudades } from '@/components/BuscadorCiudad';
import { Escudo } from '@/components/Escudo';
import { useAvisos } from '@/components/avisos/Avisos';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  nombre: string;
  categoriaGenero: string;
  modalidadHabitual: string | null;
  ciudadId: string;
  escudoUrl: string | null;
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
  escudoUrl: escudoUrlInicial,
  provincias,
}: Props) {
  const router = useRouter();
  const avisos = useAvisos();
  const [nombre, setNombre] = useState(nombreInicial);
  const [categoriaGenero, setCategoriaGenero] = useState(categoriaGeneroInicial);
  const [modalidadHabitual, setModalidadHabitual] = useState(modalidadInicial ?? '');
  const [ciudadId, setCiudadId] = useState(ciudadIdInicial);
  const [enviando, setEnviando] = useState(false);

  const inputEscudoRef = useRef<HTMLInputElement>(null);
  const [escudoUrl, setEscudoUrl] = useState(escudoUrlInicial);
  const [subiendoEscudo, setSubiendoEscudo] = useState(false);

  async function subirEscudo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    // Antes de mandar nada: un archivo demasiado grande lo corta la
    // plataforma con una respuesta que no es JSON, y eso se reportaba
    // como un problema de conexión que no existía.
    const problema = validarArchivo(archivo, TIPOS_IMAGEN);
    if (problema) {
      avisos.error(problema);
      return;
    }

    setSubiendoEscudo(true);
    const enCurso = avisos.cargando('Subiendo escudo…');
    const datosFormulario = new FormData();
    datosFormulario.append('equipoId', equipoId);
    datosFormulario.append('archivo', archivo);

    const resultado = await subirArchivo('/api/equipos/escudo', datosFormulario);
    setSubiendoEscudo(false);
    if (!resultado.ok) {
      avisos.error(resultado.mensaje, enCurso);
      return;
    }
    setEscudoUrl(resultado.data.escudoUrl ?? null);
    avisos.exito('Escudo actualizado', enCurso);
    router.refresh();
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const enCurso = avisos.cargando('Guardando…');

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
        avisos.error(cuerpo?.error?.mensaje ?? 'No se pudieron guardar los cambios.', enCurso);
        return;
      }
      avisos.exito('Equipo actualizado', enCurso);
      router.refresh();
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formularioChico} onSubmit={enviar}>
      <div className={styles.filaEscudo}>
        <button
          type="button"
          className={styles.botonEscudo}
          onClick={() => inputEscudoRef.current?.click()}
          disabled={subiendoEscudo}
          aria-label="Cambiar escudo del equipo"
        >
          <Escudo src={escudoUrl} nombre={nombre} tamano={64} />
        </button>
        <input
          ref={inputEscudoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={subirEscudo}
        />
        <div>
          <button
            type="button"
            className={styles.enlaceEscudo}
            onClick={() => inputEscudoRef.current?.click()}
            disabled={subiendoEscudo}
          >
            {subiendoEscudo ? 'Subiendo…' : 'Cambiar escudo'}
          </button>
        </div>
      </div>

      <label htmlFor="nombreEquipo">Nombre del equipo</label>
      <input
        id="nombreEquipo"
        type="text"
        required
        placeholder="Nombre del equipo"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
      />

      <label htmlFor="categoriaGeneroEquipo">Categoría de género</label>
      <select
        id="categoriaGeneroEquipo"
        value={categoriaGenero}
        onChange={(evento) => setCategoriaGenero(evento.target.value)}
      >
        {CATEGORIAS_GENERO.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>

      <label htmlFor="modalidadHabitualEquipo">Modalidad habitual</label>
      <select
        id="modalidadHabitualEquipo"
        value={modalidadHabitual}
        onChange={(evento) => setModalidadHabitual(evento.target.value)}
      >
        {MODALIDADES.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>

      <label htmlFor="ciudadEquipo">Ciudad</label>
      <BuscadorCiudad
        id="ciudadEquipo"
        provincias={provincias}
        value={ciudadId}
        onChange={setCiudadId}
      />

      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar datos del equipo'}
      </button>
    </form>
  );
}
