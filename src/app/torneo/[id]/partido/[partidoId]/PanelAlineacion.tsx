'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { JugadorAlineado, JugadorHabilitado } from '@/services/competencia/obtenerPartido';
import styles from './pagina.module.css';

export interface PanelAlineacionProps {
  partidoId: string;
  version: number;
  golesLocal: number;
  golesVisitante: number;
  local: { id: string; nombre: string };
  visitante: { id: string; nombre: string };
  alineacion: JugadorAlineado[];
  /** Vacío para quien no puede cargarla: entonces esto es sólo lectura. */
  habilitados: JugadorHabilitado[];
  puedeCargar: boolean;
}

/**
 * UC-38 — Quiénes jugaron este partido.
 *
 * Se guarda a través de `cargarResultado`, que es quien sabe hacerlo en
 * una sola transacción junto con el marcador y la planilla: un servicio
 * aparte tendría que repetir el control de versión y volver a tocar
 * `estadistica_jugador`, con dos lugares desde donde se puede
 * descuadrar el acumulado. Por eso manda el marcador que ya está, sin
 * cambiarlo.
 *
 * **No es obligatoria.** Esto es fútbol amateur: obligar a tildar once
 * nombres por equipo para anotar un 2 a 1 haría que no se cargue nada.
 * Quien la carga, le da historial a sus jugadores; quien no, queda como
 * estaba.
 */
export function PanelAlineacion({
  partidoId,
  version,
  golesLocal,
  golesVisitante,
  local,
  visitante,
  alineacion,
  habilitados,
  puedeCargar,
}: PanelAlineacionProps) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<Map<string, boolean>>(
    () => new Map(alineacion.map((jugador) => [jugador.perfilId, jugador.fueTitular])),
  );

  const porEquipo = useMemo(
    () => ({
      [local.id]: habilitados.filter((jugador) => jugador.equipoId === local.id),
      [visitante.id]: habilitados.filter((jugador) => jugador.equipoId === visitante.id),
    }),
    [habilitados, local.id, visitante.id],
  );

  const alineadosPorEquipo = (equipoId: string) =>
    alineacion.filter((jugador) => jugador.equipoId === equipoId);

  function alternar(perfilId: string) {
    setSeleccion((actual) => {
      const copia = new Map(actual);
      if (copia.has(perfilId)) copia.delete(perfilId);
      else copia.set(perfilId, true);
      return copia;
    });
  }

  function cambiarTitularidad(perfilId: string, fueTitular: boolean) {
    setSeleccion((actual) => new Map(actual).set(perfilId, fueTitular));
  }

  async function guardar() {
    setEnviando(true);
    setError(null);

    const alineaciones = [...seleccion.entries()].map(([perfilId, fueTitular]) => ({
      perfilId,
      equipoId: habilitados.find((jugador) => jugador.perfilId === perfilId)!.equipoId,
      fueTitular,
    }));

    try {
      const respuesta = await fetch('/api/partidos/cargar-resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // El marcador va tal cual está: esto no lo cambia.
        body: JSON.stringify({
          partidoId,
          version,
          golesLocal,
          golesVisitante,
          alineaciones,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos guardar la alineación.');
        setEnviando(false);
        return;
      }
      setEditando(false);
      setEnviando(false);
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  // Sin alineación cargada y sin poder cargarla, no hay nada que decir.
  if (alineacion.length === 0 && !puedeCargar) return null;

  return (
    <section className={styles.alineacion}>
      <div className={styles.filaTituloAlineacion}>
        <h2 className={styles.tituloAlineacion}>Quiénes jugaron</h2>
        {puedeCargar && !editando && (
          <button
            type="button"
            className={styles.botonAlineacion}
            onClick={() => setEditando(true)}
          >
            {alineacion.length === 0 ? 'Cargar' : 'Editar'}
          </button>
        )}
      </div>

      {error && <p className={styles.errorAlineacion}>{error}</p>}

      {editando ? (
        <>
          {[local, visitante].map((equipo) => (
            <div key={equipo.id} className={styles.equipoAlineacion}>
              <h3 className={styles.nombreEquipoAlineacion}>{equipo.nombre}</h3>
              {porEquipo[equipo.id]!.length === 0 ? (
                <p className={styles.sinHabilitados}>
                  Este equipo todavía no cargó su lista de buena fe.
                </p>
              ) : (
                <ul className={styles.listaHabilitados}>
                  {porEquipo[equipo.id]!.map((jugador) => {
                    const juega = seleccion.has(jugador.perfilId);
                    return (
                      <li key={jugador.perfilId} className={styles.filaHabilitado}>
                        <label className={styles.etiquetaHabilitado}>
                          <input
                            type="checkbox"
                            checked={juega}
                            onChange={() => alternar(jugador.perfilId)}
                          />
                          <span className={styles.nombreHabilitado}>
                            {jugador.numeroCamiseta !== null && (
                              <span className={styles.camiseta}>{jugador.numeroCamiseta}</span>
                            )}
                            {jugador.nombreVisible}
                          </span>
                        </label>
                        {juega && (
                          <div className={styles.segmentoTitular} role="radiogroup">
                            <button
                              type="button"
                              role="radio"
                              aria-checked={seleccion.get(jugador.perfilId) === true}
                              className={
                                seleccion.get(jugador.perfilId)
                                  ? styles.segmentoActivo
                                  : styles.segmento
                              }
                              onClick={() => cambiarTitularidad(jugador.perfilId, true)}
                            >
                              Titular
                            </button>
                            <button
                              type="button"
                              role="radio"
                              aria-checked={seleccion.get(jugador.perfilId) === false}
                              className={
                                seleccion.get(jugador.perfilId)
                                  ? styles.segmento
                                  : styles.segmentoActivo
                              }
                              onClick={() => cambiarTitularidad(jugador.perfilId, false)}
                            >
                              Entró
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}

          <div className={styles.accionesAlineacion}>
            <button type="button" onClick={guardar} disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar alineación'}
            </button>
            <button
              type="button"
              className={styles.botonSecundarioAlineacion}
              onClick={() => {
                setEditando(false);
                setError(null);
                setSeleccion(new Map(alineacion.map((j) => [j.perfilId, j.fueTitular])));
              }}
              disabled={enviando}
            >
              Cancelar
            </button>
          </div>
        </>
      ) : alineacion.length === 0 ? (
        <p className={styles.sinAlineacion}>Todavía no se cargó quiénes jugaron.</p>
      ) : (
        [local, visitante].map((equipo) => {
          const jugadores = alineadosPorEquipo(equipo.id);
          if (jugadores.length === 0) return null;
          return (
            <div key={equipo.id} className={styles.equipoAlineacion}>
              <h3 className={styles.nombreEquipoAlineacion}>{equipo.nombre}</h3>
              <ul className={styles.listaAlineados}>
                {jugadores.map((jugador) => (
                  <li key={jugador.perfilId} className={styles.alineado}>
                    {jugador.nombreVisible}
                    {!jugador.fueTitular && <span className={styles.entro}>entró</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}
