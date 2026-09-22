'use client';
import { subirArchivo, validarArchivo, TIPOS_IMAGEN } from '@/lib/subidaCliente';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import type { MiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { BuscadorCiudad, type ProvinciaConCiudades } from '@/components/BuscadorCiudad';
import { Escudo } from '@/components/Escudo';
import { useAvisos } from '@/components/avisos/Avisos';
import styles from '../../ingresar/pagina.module.css';
import propios from './FormularioEditarPerfil.module.css';

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
  const avisos = useAvisos();
  const [nombreVisible, setNombreVisible] = useState(perfil.nombreVisible);
  const [posicion, setPosicion] = useState(perfil.posicion ?? 'unspecified');
  const [ciudadId, setCiudadId] = useState(perfil.ciudadId ?? '');
  const [visibilidad, setVisibilidad] = useState(perfil.visibilidad);
  const [enviando, setEnviando] = useState(false);

  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState(perfil.fotoUrl);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  async function subirFoto(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    const problema = validarArchivo(archivo, TIPOS_IMAGEN);
    if (problema) {
      avisos.error(problema);
      return;
    }

    setSubiendoFoto(true);
    const enCurso = avisos.cargando('Subiendo foto…');
    const datosFormulario = new FormData();
    datosFormulario.append('archivo', archivo);

    const resultado = await subirArchivo('/api/mi-perfil/foto', datosFormulario);
    setSubiendoFoto(false);
    if (!resultado.ok) {
      avisos.error(resultado.mensaje, enCurso);
      return;
    }
    setFotoUrl(resultado.data.fotoUrl ?? null);
    avisos.exito('Foto actualizada', enCurso);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const enCurso = avisos.cargando('Guardando…');

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
        avisos.error(cuerpo?.error?.mensaje ?? 'No se pudieron guardar los cambios.', enCurso);
        return;
      }
      avisos.exito('Perfil actualizado', enCurso);
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <div className={styles.filaEtiqueta}>
        <h1 className={`fuente-display ${styles.titulo}`}>Mi perfil</h1>
        <Link href={`/jugador/${perfil.id}`} className={styles.enlaceChico}>
          Ver cómo te ven los demás
        </Link>
      </div>
      <p className={styles.texto}>Todo acá es opcional — nada de esto te bloquea nada.</p>

      <div className={propios.filaFoto}>
        <button
          type="button"
          className={propios.botonFoto}
          onClick={() => inputFotoRef.current?.click()}
          disabled={subiendoFoto}
          aria-label="Cambiar foto de perfil"
        >
          <Escudo src={fotoUrl} nombre={nombreVisible} tamano={64} />
        </button>
        <input
          ref={inputFotoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={subirFoto}
        />
        <div>
          <button
            type="button"
            className={propios.enlaceFoto}
            onClick={() => inputFotoRef.current?.click()}
            disabled={subiendoFoto}
          >
            {subiendoFoto ? 'Subiendo…' : 'Cambiar foto'}
          </button>
        </div>
      </div>

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
        <label htmlFor="ciudadId">Ciudad</label>
        <BuscadorCiudad
          id="ciudadId"
          provincias={provincias}
          value={ciudadId}
          onChange={setCiudadId}
        />
        <span className={styles.ayuda}>Se muestra en tu perfil público.</span>
      </div>

      <div className={styles.campo}>
        <span>Posición (opcional)</span>
        <div className={propios.chips}>
          {POSICIONES.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setPosicion(opcion.valor)}
              className={`${propios.chip} ${posicion === opcion.valor ? propios.chipActiva : ''}`}
              aria-pressed={posicion === opcion.valor}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.campo}>
        <span>Visibilidad del perfil</span>
        <div className={propios.cards}>
          <button
            type="button"
            onClick={() => setVisibilidad('public')}
            className={`${propios.card} ${visibilidad === 'public' ? propios.cardActiva : ''}`}
            aria-pressed={visibilidad === 'public'}
          >
            <div className={propios.cardTitulo}>Público</div>
            <div className={propios.cardDescripcion}>
              Cualquiera ve tu foto, tu posición y tu ciudad. Es lo que hace que un capitán te
              encuentre.
            </div>
          </button>
          <button
            type="button"
            onClick={() => setVisibilidad('restricted')}
            className={`${propios.card} ${visibilidad === 'restricted' ? propios.cardActiva : ''}`}
            aria-pressed={visibilidad === 'restricted'}
          >
            <div className={propios.cardTitulo}>Restringido</div>
            <div className={propios.cardDescripcion}>
              Ocultás tu foto, tu posición y tu ciudad. Tu nombre y tus equipos siguen siendo
              públicos — tu participación en sí nunca se oculta.
            </div>
          </button>
        </div>
      </div>

      <button type="submit" className={styles.boton} disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
