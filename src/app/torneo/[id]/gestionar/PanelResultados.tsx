'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EstadoVacio } from '@/components/EstadoVacio';
import styles from './pagina.module.css';

export interface IntegranteElegible {
  perfilId: string;
  nombreVisible: string;
  rolEnTorneo: 'player' | 'coach';
}

export interface PartidoResultado {
  id: string;
  numeroFecha: number;
  equipoLocalId: string;
  equipoLocalNombre: string;
  equipoVisitanteId: string;
  equipoVisitanteNombre: string;
  version: number;
}

export interface PanelResultadosProps {
  partidos: PartidoResultado[];
  /** Habilitados de cada equipo (UC-34), para atribuir goles y tarjetas. */
  elegiblesPorEquipo: Record<string, IntegranteElegible[]>;
}

type TipoEvento = 'goal' | 'own_goal' | 'yellow_card' | 'red_card';

const ETIQUETA_TIPO_EVENTO: Record<TipoEvento, string> = {
  goal: 'Gol',
  own_goal: 'Gol en contra',
  yellow_card: 'Amarilla',
  red_card: 'Roja',
};

interface EventoForm {
  clave: string;
  equipoId: string;
  perfilId: string;
  tipoEvento: TipoEvento;
}

/** UC-31 — Cargar el resultado de un partido a mano, con su `version` para el optimistic concurrency. */
export function PanelResultados({ partidos, elegiblesPorEquipo }: PanelResultadosProps) {
  const router = useRouter();
  const [goles, setGoles] = useState<Record<string, { local: string; visitante: string }>>({});
  const [eventos, setEventos] = useState<Record<string, EventoForm[]>>({});
  const [jugadorDelPartido, setJugadorDelPartido] = useState<Record<string, string>>({});
  const [abiertoEventos, setAbiertoEventos] = useState<Record<string, boolean>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idBase = useId();

  function actualizar(partidoId: string, campo: 'local' | 'visitante', valor: string) {
    setGoles((actual) => ({
      ...actual,
      [partidoId]: { local: '', visitante: '', ...actual[partidoId], [campo]: valor },
    }));
  }

  function rolDe(equipoId: string, perfilId: string): 'player' | 'coach' | undefined {
    return elegiblesPorEquipo[equipoId]?.find((persona) => persona.perfilId === perfilId)?.rolEnTorneo;
  }

  function tiposPermitidos(equipoId: string, perfilId: string): TipoEvento[] {
    const rol = rolDe(equipoId, perfilId);
    if (rol === 'coach') return ['yellow_card', 'red_card'];
    if (rol === 'player') return ['goal', 'own_goal', 'yellow_card', 'red_card'];
    return [];
  }

  function agregarEvento(partido: PartidoResultado) {
    const primerElegible =
      elegiblesPorEquipo[partido.equipoLocalId]?.[0] ?? elegiblesPorEquipo[partido.equipoVisitanteId]?.[0];
    if (!primerElegible) return;
    const equipoId = elegiblesPorEquipo[partido.equipoLocalId]?.includes(primerElegible)
      ? partido.equipoLocalId
      : partido.equipoVisitanteId;
    const tipos = tiposPermitidos(equipoId, primerElegible.perfilId);
    setEventos((actual) => ({
      ...actual,
      [partido.id]: [
        ...(actual[partido.id] ?? []),
        {
          clave: `${Date.now()}-${Math.random()}`,
          equipoId,
          perfilId: primerElegible.perfilId,
          tipoEvento: tipos[0] ?? 'goal',
        },
      ],
    }));
  }

  function actualizarQuien(partidoId: string, clave: string, equipoId: string, perfilId: string) {
    const tipos = tiposPermitidos(equipoId, perfilId);
    setEventos((actual) => ({
      ...actual,
      [partidoId]: (actual[partidoId] ?? []).map((evento) =>
        evento.clave === clave
          ? { ...evento, equipoId, perfilId, tipoEvento: tipos[0] ?? evento.tipoEvento }
          : evento,
      ),
    }));
  }

  function actualizarTipo(partidoId: string, clave: string, tipoEvento: TipoEvento) {
    setEventos((actual) => ({
      ...actual,
      [partidoId]: (actual[partidoId] ?? []).map((evento) =>
        evento.clave === clave ? { ...evento, tipoEvento } : evento,
      ),
    }));
  }

  function quitarEvento(partidoId: string, clave: string) {
    setEventos((actual) => ({
      ...actual,
      [partidoId]: (actual[partidoId] ?? []).filter((evento) => evento.clave !== clave),
    }));
  }

  async function cargar(partido: PartidoResultado) {
    const valores = goles[partido.id];
    const golesLocal = Number(valores?.local);
    const golesVisitante = Number(valores?.visitante);
    if (!valores || !Number.isInteger(golesLocal) || !Number.isInteger(golesVisitante)) return;

    setEnviando(partido.id);
    setError(null);
    try {
      const eventosPartido = eventos[partido.id] ?? [];
      const elegidoJugadorDelPartido = jugadorDelPartido[partido.id];
      const respuesta = await fetch('/api/partidos/cargar-resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partidoId: partido.id,
          version: partido.version,
          golesLocal,
          golesVisitante,
          ...(eventosPartido.length > 0
            ? {
                eventos: eventosPartido.map((evento) => ({
                  perfilId: evento.perfilId,
                  equipoId: evento.equipoId,
                  tipoEvento: evento.tipoEvento,
                })),
              }
            : {}),
          ...(elegidoJugadorDelPartido
            ? { jugadorDelPartidoPerfilId: elegidoJugadorDelPartido }
            : {}),
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos cargar el resultado.');
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(null);
    }
  }

  if (partidos.length === 0) {
    return <EstadoVacio mensaje="No hay partidos sin resultado." />;
  }

  return (
    <div className={styles.lista}>
      {error && <p className={styles.errorChico}>{error}</p>}
      {partidos.map((partido) => {
        const valores = goles[partido.id] ?? { local: '', visitante: '' };
        const elegiblesLocal = elegiblesPorEquipo[partido.equipoLocalId] ?? [];
        const elegiblesVisitante = elegiblesPorEquipo[partido.equipoVisitanteId] ?? [];
        const hayElegibles = elegiblesLocal.length > 0 || elegiblesVisitante.length > 0;
        const eventosPartido = eventos[partido.id] ?? [];
        const jugadoresLocal = elegiblesLocal.filter((persona) => persona.rolEnTorneo === 'player');
        const jugadoresVisitante = elegiblesVisitante.filter(
          (persona) => persona.rolEnTorneo === 'player',
        );
        const hayJugadores = jugadoresLocal.length > 0 || jugadoresVisitante.length > 0;

        return (
          <div key={partido.id} className={styles.filaPartido}>
            <span className={styles.nombresPartido}>
              Fecha {partido.numeroFecha} — {partido.equipoLocalNombre} vs{' '}
              {partido.equipoVisitanteNombre}
            </span>
            <div className={styles.filaGoles}>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Goles de ${partido.equipoLocalNombre}`}
                value={valores.local}
                onChange={(evento) => actualizar(partido.id, 'local', evento.target.value)}
              />
              <span>—</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Goles de ${partido.equipoVisitanteNombre}`}
                value={valores.visitante}
                onChange={(evento) => actualizar(partido.id, 'visitante', evento.target.value)}
              />
              <button
                type="button"
                onClick={() => cargar(partido)}
                disabled={enviando !== null || valores.local === '' || valores.visitante === ''}
              >
                {enviando === partido.id ? 'Cargando…' : 'Cargar'}
              </button>
            </div>

            {hayJugadores && (
              <label className={styles.campoJugadorDelPartido}>
                Jugador del partido (opcional)
                <select
                  aria-label="Jugador del partido"
                  value={jugadorDelPartido[partido.id] ?? ''}
                  onChange={(evento) =>
                    setJugadorDelPartido((actual) => ({
                      ...actual,
                      [partido.id]: evento.target.value,
                    }))
                  }
                >
                  <option value="">Sin elegir</option>
                  {jugadoresLocal.length > 0 && (
                    <optgroup label={partido.equipoLocalNombre}>
                      {jugadoresLocal.map((persona) => (
                        <option key={persona.perfilId} value={persona.perfilId}>
                          {persona.nombreVisible}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {jugadoresVisitante.length > 0 && (
                    <optgroup label={partido.equipoVisitanteNombre}>
                      {jugadoresVisitante.map((persona) => (
                        <option key={persona.perfilId} value={persona.perfilId}>
                          {persona.nombreVisible}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
            )}

            {hayElegibles && (
              <div className={styles.eventos}>
                <button
                  type="button"
                  className={styles.botonSecundarioChico}
                  onClick={() =>
                    setAbiertoEventos((actual) => ({ ...actual, [partido.id]: !actual[partido.id] }))
                  }
                >
                  {abiertoEventos[partido.id] ? 'Ocultar goleadores y tarjetas' : 'Goleadores y tarjetas (opcional)'}
                </button>

                {abiertoEventos[partido.id] && (
                  <div className={styles.listaEventos}>
                    {eventosPartido.map((evento) => {
                      const tipos = tiposPermitidos(evento.equipoId, evento.perfilId);
                      return (
                        <div key={evento.clave} className={styles.filaEvento}>
                          <select
                            aria-label="Quién"
                            id={`${idBase}-${evento.clave}-quien`}
                            value={`${evento.equipoId}::${evento.perfilId}`}
                            onChange={(cambio) => {
                              const [equipoId, perfilId] = cambio.target.value.split('::');
                              actualizarQuien(partido.id, evento.clave, equipoId!, perfilId!);
                            }}
                          >
                            {elegiblesLocal.length > 0 && (
                              <optgroup label={partido.equipoLocalNombre}>
                                {elegiblesLocal.map((persona) => (
                                  <option
                                    key={persona.perfilId}
                                    value={`${partido.equipoLocalId}::${persona.perfilId}`}
                                  >
                                    {persona.nombreVisible}
                                    {persona.rolEnTorneo === 'coach' ? ' (DT)' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {elegiblesVisitante.length > 0 && (
                              <optgroup label={partido.equipoVisitanteNombre}>
                                {elegiblesVisitante.map((persona) => (
                                  <option
                                    key={persona.perfilId}
                                    value={`${partido.equipoVisitanteId}::${persona.perfilId}`}
                                  >
                                    {persona.nombreVisible}
                                    {persona.rolEnTorneo === 'coach' ? ' (DT)' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <select
                            aria-label="Tipo de evento"
                            value={evento.tipoEvento}
                            onChange={(cambio) =>
                              actualizarTipo(partido.id, evento.clave, cambio.target.value as TipoEvento)
                            }
                          >
                            {tipos.map((tipo) => (
                              <option key={tipo} value={tipo}>
                                {ETIQUETA_TIPO_EVENTO[tipo]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={styles.botonPeligroChico}
                            onClick={() => quitarEvento(partido.id, evento.clave)}
                            aria-label="Quitar"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.botonSecundarioChico}
                      onClick={() => agregarEvento(partido)}
                    >
                      + Agregar gol o tarjeta
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
