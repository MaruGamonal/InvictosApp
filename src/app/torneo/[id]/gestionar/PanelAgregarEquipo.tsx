'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAvisos } from '@/components/avisos/Avisos';
import { motivoDelFallo } from '@/components/avisos/motivoDelFallo';
import { Escudo } from '@/components/Escudo';
import styles from './pagina.module.css';

export interface PanelAgregarEquipoProps {
  torneoId: string;
  /** Con las inscripciones cerradas no se agrega nadie, ni a mano. */
  habilitado: boolean;
}

interface EquipoEncontrado {
  id: string;
  nombre: string;
  escudoUrl: string | null;
  ciudad: string | null;
}

const CATEGORIAS = [
  { valor: 'male', etiqueta: 'Masculino' },
  { valor: 'female', etiqueta: 'Femenino' },
  { valor: 'mixed', etiqueta: 'Mixto' },
] as const;

/**
 * UC-26 — El organizador carga un equipo a mano.
 *
 * **Por qué faltaba y por qué importa.** `inscribirEquipoManual` existe
 * y está probado desde T20, y ninguna pantalla lo alcanzaba: el
 * servicio sólo se podía invocar desde sus propios tests. Y es la
 * funcionalidad que `07` declara **innegociable en el MVP**, por el
 * motivo más concreto que hay: el primer organizador llega con los
 * equipos que ya tiene, y ninguno tiene cuenta. Sin esto, armar un
 * torneo exigía que ocho capitanes se registraran primero.
 *
 * **Busca antes de crear.** Si el equipo ya está en la plataforma —con
 * su plantel, su escudo y su historial—, crear uno nuevo con el mismo
 * nombre deja dos: el que juega y el que tiene los datos. Por eso el
 * campo de nombre busca mientras se escribe, y crear es lo que queda
 * cuando no aparece ninguno.
 */
export function PanelAgregarEquipo({ torneoId, habilitado }: PanelAgregarEquipoProps) {
  const router = useRouter();
  const avisos = useAvisos();
  const [nombre, setNombre] = useState('');
  const [categoriaGenero, setCategoriaGenero] = useState<'male' | 'female' | 'mixed'>('mixed');
  const [encontrados, setEncontrados] = useState<EquipoEncontrado[]>([]);
  const [enviando, setEnviando] = useState(false);

  const buscado = nombre.trim();

  useEffect(() => {
    if (buscado.length < 2) {
      setEncontrados([]);
      return;
    }
    // `cancelado` vive acá y no adentro del `setTimeout`: lo que se
    // devuelve desde el callback de un timeout no lo limpia nadie. Con
    // la bandera adentro, una respuesta lenta de una búsqueda vieja
    // pisaba los resultados de la nueva.
    let cancelado = false;
    // Y un respiro antes de buscar: sin esto sale un pedido por tecla.
    const temporizador = setTimeout(() => {
      fetch(`/api/equipos?texto=${encodeURIComponent(buscado)}`)
        .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
        .then((cuerpo) => {
          if (!cancelado && Array.isArray(cuerpo?.data?.equipos)) {
            setEncontrados(cuerpo.data.equipos);
          }
        })
        .catch(() => {});
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [buscado]);

  async function agregar(cuerpo: Record<string, unknown>, comoSeLlama: string) {
    if (enviando) return;
    setEnviando(true);
    const enCurso = avisos.cargando('Agregando el equipo…');
    try {
      const respuesta = await fetch('/api/inscripciones/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, ...cuerpo }),
      });
      const resultado = await respuesta.json();
      // `fetch` no lanza con 4xx ni 5xx.
      if (!respuesta.ok || !resultado.ok) {
        avisos.error(motivoDelFallo(resultado, 'No pudimos agregar el equipo.'), enCurso);
        setEnviando(false);
        return;
      }
      // La categoría distinta no frena nada (`06`, D-82): es información
      // para decidir, y el organizador ya decidió. Pero se avisa.
      avisos.exito(
        resultado.data?.advertenciaCategoria
          ? `${comoSeLlama} quedó inscripto, con una categoría distinta a la del torneo.`
          : `${comoSeLlama} quedó inscripto.`,
        enCurso,
      );
      setNombre('');
      setEncontrados([]);
      router.refresh();
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviando(false);
    }
  }

  if (!habilitado) return null;

  return (
    <div className={styles.formularioChico}>
      <span className={styles.tituloSeccion}>Agregar un equipo a mano</span>
      <p className={styles.avisoChico}>
        Para los equipos que todavía no están en la aplicación. Queda inscripto directamente, sin
        pasar por solicitud.
      </p>

      <label>
        Nombre del equipo
        <input
          type="text"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          placeholder="Defemi Bordo"
          disabled={enviando}
        />
      </label>

      {encontrados.length > 0 && (
        <div className={styles.lista}>
          <span className={styles.avisoChico}>
            Ya están en la aplicación. Si es alguno de estos, elegilo: conserva su plantel y su
            historial.
          </span>
          {encontrados.map((equipo) => (
            <div key={equipo.id} className={styles.filaPendiente}>
              <span className={styles.nombreIntegrante}>
                <Escudo src={equipo.escudoUrl} nombre={equipo.nombre} tamano={28} />
                {equipo.nombre}
                {equipo.ciudad && <span className={styles.rolIntegrante}> · {equipo.ciudad}</span>}
              </span>
              <button
                type="button"
                className={styles.botonSecundarioChico}
                onClick={() => agregar({ equipoId: equipo.id }, equipo.nombre)}
                disabled={enviando}
              >
                Inscribirlo
              </button>
            </div>
          ))}
        </div>
      )}

      <label>
        Categoría del equipo nuevo
        <select
          value={categoriaGenero}
          onChange={(evento) =>
            setCategoriaGenero(evento.target.value as 'male' | 'female' | 'mixed')
          }
          disabled={enviando}
        >
          {CATEGORIAS.map((categoria) => (
            <option key={categoria.valor} value={categoria.valor}>
              {categoria.etiqueta}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => agregar({ nombre: buscado, categoriaGenero }, buscado)}
        disabled={enviando || buscado.length === 0}
      >
        {enviando ? 'Agregando…' : `Crear «${buscado || '…'}» e inscribirlo`}
      </button>
    </div>
  );
}
