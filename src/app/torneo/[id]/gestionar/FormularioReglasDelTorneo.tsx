'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAvisos } from '@/components/avisos/Avisos';
import { motivoDelFallo } from '@/components/avisos/motivoDelFallo';
import type { ReglasDelTorneo } from '@/services/torneos/obtenerGestionTorneo';
import styles from './pagina.module.css';

export interface FormularioReglasDelTorneoProps {
  torneoId: string;
  reglas: ReglasDelTorneo;
  /** Con partidos ya jugados, cambiar el puntaje reescribiría la historia de la tabla. */
  hayPartidosJugados: boolean;
}

/** Para un `datetime-local`, que no entiende ISO con zona. */
function paraInput(iso: string | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/**
 * UC-19 — Las reglas de competencia del torneo (migración
 * `parametros-configurables-de-torneo`).
 *
 * **Por qué aparece recién ahora.** Estos diez parámetros existían en la
 * tabla desde T9, viajaban por `crearTorneo` y `actualizarTorneo`, se
 * copiaban al abrir una división… y ninguna pantalla los mostraba ni
 * los dejaba cambiar. Para tocar el puntaje de una victoria había que
 * pegarle a la API. El caso que lo volvió urgente fue
 * `soloOrganizadorCargaResultados`: ahora que el capitán puede cargar
 * resultados de verdad, un organizador que no quiera eso necesita poder
 * decirlo.
 *
 * **El puntaje se congela con el primer partido jugado.** La tabla se
 * calcula como una diferencia, partido por partido
 * (`_recalcularPosicion`), no recorriendo todo de nuevo: cambiar los
 * puntos a mitad de torneo dejaría una tabla que no se explica por
 * ningún conjunto de reglas — parte sumada con las viejas y parte con
 * las nuevas. El campo se apaga y la pantalla dice por qué, en vez de
 * aceptar el cambio y producir una tabla que nadie puede auditar.
 *
 * `criteriosDesempate` no está: es una lista **ordenada** y su pantalla
 * es reordenar, no completar un campo. Queda para su propio ticket.
 */
export function FormularioReglasDelTorneo({
  torneoId,
  reglas,
  hayPartidosJugados,
}: FormularioReglasDelTorneoProps) {
  const router = useRouter();
  const avisos = useAvisos();
  const [valores, setValores] = useState({
    minJugadoresLista: reglas.minJugadoresLista === null ? '' : String(reglas.minJugadoresLista),
    maxJugadoresLista: reglas.maxJugadoresLista === null ? '' : String(reglas.maxJugadoresLista),
    puntosVictoria: String(reglas.puntosVictoria),
    puntosEmpate: String(reglas.puntosEmpate),
    puntosDerrota: String(reglas.puntosDerrota),
    golesWalkoverGanador: String(reglas.golesWalkoverGanador),
    golesWalkoverPerdedor: String(reglas.golesWalkoverPerdedor),
    fechaCierreListaBuenaFe: paraInput(reglas.fechaCierreListaBuenaFe),
  });
  const [jugadorUnico, setJugadorUnico] = useState(reglas.jugadorUnicoPorEquipo);
  const [soloOrganizador, setSoloOrganizador] = useState(reglas.soloOrganizadorCargaResultados);
  const [abandono, setAbandono] = useState(reglas.partidosPendientesPorAbandono);
  const [enviando, setEnviando] = useState(false);

  function cambiar(campo: keyof typeof valores) {
    return (evento: { target: { value: string } }) =>
      setValores((previos) => ({ ...previos, [campo]: evento.target.value }));
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true);
    const enCurso = avisos.cargando('Guardando…');

    const cuerpo: Record<string, unknown> = {
      torneoId,
      jugadorUnicoPorEquipo: jugadorUnico,
      soloOrganizadorCargaResultados: soloOrganizador,
      partidosPendientesPorAbandono: abandono,
      golesWalkoverGanador: Number(valores.golesWalkoverGanador),
      golesWalkoverPerdedor: Number(valores.golesWalkoverPerdedor),
    };
    // Los topes de plantel son opcionales: vacío quiere decir "sin
    // tope", que es como nace un torneo. Mandar `Number('')` sería
    // mandar 0, o sea "ningún jugador habilitado".
    if (valores.minJugadoresLista) cuerpo.minJugadoresLista = Number(valores.minJugadoresLista);
    if (valores.maxJugadoresLista) cuerpo.maxJugadoresLista = Number(valores.maxJugadoresLista);
    // Con partidos jugados el puntaje ni se manda: el campo está
    // apagado, y mandarlo igual sería confiar en que el `disabled` del
    // navegador es una regla.
    if (!hayPartidosJugados) {
      cuerpo.puntosVictoria = Number(valores.puntosVictoria);
      cuerpo.puntosEmpate = Number(valores.puntosEmpate);
      cuerpo.puntosDerrota = Number(valores.puntosDerrota);
    }
    if (valores.fechaCierreListaBuenaFe) {
      cuerpo.fechaCierreListaBuenaFe = new Date(valores.fechaCierreListaBuenaFe).toISOString();
    }

    try {
      const respuesta = await fetch('/api/torneos/actualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const resultado = await respuesta.json();
      // `fetch` no lanza con 4xx ni 5xx.
      if (!respuesta.ok || !resultado.ok) {
        avisos.error(motivoDelFallo(resultado, 'No pudimos guardar las reglas.'), enCurso);
        setEnviando(false);
        return;
      }
      avisos.exito('Reglas actualizadas', enCurso);
      router.refresh();
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formularioChico} onSubmit={guardar}>
      <label>
        Mínimo de jugadores en la lista de buena fe (vacío: sin mínimo)
        <input
          type="number"
          min={1}
          value={valores.minJugadoresLista}
          onChange={cambiar('minJugadoresLista')}
        />
      </label>
      <label>
        Máximo de jugadores en la lista de buena fe (vacío: sin máximo)
        <input
          type="number"
          min={1}
          value={valores.maxJugadoresLista}
          onChange={cambiar('maxJugadoresLista')}
        />
      </label>

      <label>
        Puntos por ganar
        <input
          type="number"
          min={0}
          value={valores.puntosVictoria}
          onChange={cambiar('puntosVictoria')}
          disabled={hayPartidosJugados}
        />
      </label>
      <label>
        Puntos por empatar
        <input
          type="number"
          min={0}
          value={valores.puntosEmpate}
          onChange={cambiar('puntosEmpate')}
          disabled={hayPartidosJugados}
        />
      </label>
      <label>
        Puntos por perder
        <input
          type="number"
          min={0}
          value={valores.puntosDerrota}
          onChange={cambiar('puntosDerrota')}
          disabled={hayPartidosJugados}
        />
      </label>
      {hayPartidosJugados && (
        <p className={styles.avisoChico}>
          El puntaje no se cambia con partidos ya jugados: la tabla quedaría con una parte sumada
          con las reglas viejas y otra con las nuevas.
        </p>
      )}

      <label className={styles.filaCheckbox}>
        <input
          type="checkbox"
          checked={jugadorUnico}
          onChange={(evento) => setJugadorUnico(evento.target.checked)}
        />
        Nadie puede jugar en dos equipos de este torneo
      </label>

      <label className={styles.filaCheckbox}>
        <input
          type="checkbox"
          checked={soloOrganizador}
          onChange={(evento) => setSoloOrganizador(evento.target.checked)}
        />
        Los resultados los carga solamente la organización
      </label>
      <p className={styles.avisoChico}>
        Sin esto, el capitán de cualquiera de los dos equipos puede cargar el resultado de su
        partido y el rival lo confirma u objeta.
      </p>

      <label>
        Si un equipo abandona, sus partidos que faltaban
        <select
          value={abandono}
          onChange={(evento) =>
            setAbandono(evento.target.value as ReglasDelTorneo['partidosPendientesPorAbandono'])
          }
        >
          <option value="ganados_por_rival">Los gana el rival</option>
          <option value="anulados">Se anulan</option>
        </select>
      </label>

      <label>
        Goles del ganador por presentación
        <input
          type="number"
          min={0}
          value={valores.golesWalkoverGanador}
          onChange={cambiar('golesWalkoverGanador')}
        />
      </label>
      <label>
        Goles del perdedor por presentación
        <input
          type="number"
          min={0}
          value={valores.golesWalkoverPerdedor}
          onChange={cambiar('golesWalkoverPerdedor')}
        />
      </label>

      <label>
        Cierre de las listas de buena fe
        <input
          type="datetime-local"
          value={valores.fechaCierreListaBuenaFe}
          onChange={cambiar('fechaCierreListaBuenaFe')}
        />
      </label>

      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar reglas'}
      </button>
    </form>
  );
}
