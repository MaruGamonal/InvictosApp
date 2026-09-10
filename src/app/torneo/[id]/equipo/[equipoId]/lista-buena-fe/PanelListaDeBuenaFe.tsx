'use client';

import { useState } from 'react';
import { Escudo } from '@/components/Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import type { IntegranteListaDeBuenaFe } from '@/services/inscripciones/obtenerListaDeBuenaFe';
import styles from './pagina.module.css';

interface Props {
  torneoId: string;
  equipoId: string;
  integrantes: IntegranteListaDeBuenaFe[];
  minJugadores: number | null;
  maxJugadores: number | null;
  cerrada: boolean;
}

/** Jugador si tiene el rol, si no DT, si no delegado — el mismo criterio que cuenta para el cupo de jugadores. */
function inferirRolEnTorneo(
  rolesEquipo: IntegranteListaDeBuenaFe['rolesEquipo'],
): 'player' | 'coach' | 'delegate' {
  if (rolesEquipo.includes('player')) return 'player';
  if (rolesEquipo.includes('coach')) return 'coach';
  return 'delegate';
}

export function PanelListaDeBuenaFe({
  torneoId,
  equipoId,
  integrantes,
  minJugadores,
  maxJugadores,
  cerrada,
}: Props) {
  const huboConfirmacionPrevia = integrantes.some((i) => i.rolHabilitado !== null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(
    () =>
      new Set(
        integrantes
          .filter((i) =>
            huboConfirmacionPrevia ? i.rolHabilitado !== null : !i.yaHabilitadoEnOtroEquipo,
          )
          .map((i) => i.perfilId),
      ),
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    advertenciaMinimoNoAlcanzado: boolean;
    pendientes: Array<{ perfilId: string; nombreVisible: string }>;
  } | null>(null);

  function alternar(perfilId: string) {
    setResultado(null);
    setSeleccionados((actuales) => {
      const siguiente = new Set(actuales);
      if (siguiente.has(perfilId)) siguiente.delete(perfilId);
      else siguiente.add(perfilId);
      return siguiente;
    });
  }

  const cantidadJugadores = integrantes.filter(
    (i) => seleccionados.has(i.perfilId) && inferirRolEnTorneo(i.rolesEquipo) === 'player',
  ).length;

  async function confirmar() {
    if (enviando || seleccionados.size === 0) return;
    setEnviando(true);
    setError(null);
    setResultado(null);

    try {
      const respuesta = await fetch('/api/inscripciones/confirmar-plantel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoId,
          equipoId,
          integrantes: integrantes
            .filter((i) => seleccionados.has(i.perfilId))
            .map((i) => ({ perfilId: i.perfilId, rolEnTorneo: inferirRolEnTorneo(i.rolesEquipo) })),
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo confirmar la lista. Probá de nuevo.');
        return;
      }
      setResultado({
        advertenciaMinimoNoAlcanzado: cuerpo.data.advertenciaMinimoNoAlcanzado,
        pendientes: cuerpo.data.pendientes,
      });
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  if (cerrada) {
    return (
      <p className={styles.avisoCerrada}>
        Este torneo ya cerró las incorporaciones a la lista de buena fe.
      </p>
    );
  }

  return (
    <div>
      <div className={styles.filaContador}>
        <span>{cantidadJugadores} habilitados</span>
        {maxJugadores !== null && <span>máx. {maxJugadores}</span>}
      </div>

      {error && <p className={styles.errorChico}>{error}</p>}
      {resultado && (
        <div className={styles.avisoExito}>
          <p>Lista confirmada.</p>
          {resultado.advertenciaMinimoNoAlcanzado && minJugadores !== null && (
            <p className={styles.avisoChico}>
              No llegás al mínimo de {minJugadores} jugadores que pide este torneo.
            </p>
          )}
          {resultado.pendientes.length > 0 && (
            <p className={styles.avisoChico}>
              Sin responder todavía:{' '}
              {resultado.pendientes.map((p) => p.nombreVisible).join(', ')}.
            </p>
          )}
        </div>
      )}

      <div className={styles.lista}>
        {integrantes.map((integrante) => {
          const seleccionado = seleccionados.has(integrante.perfilId);
          const bloqueado = integrante.yaHabilitadoEnOtroEquipo;
          return (
            <label
              key={integrante.perfilId}
              className={bloqueado ? styles.filaIntegranteBloqueada : styles.filaIntegrante}
            >
              <input
                type="checkbox"
                checked={seleccionado && !bloqueado}
                disabled={bloqueado || enviando}
                onChange={() => alternar(integrante.perfilId)}
              />
              <Escudo src={null} nombre={integrante.nombreVisible} tamano={32} />
              <div className={styles.datosIntegrante}>
                <span className={styles.nombreIntegrante}>{integrante.nombreVisible}</span>
                {bloqueado ? (
                  <span className={styles.avisoBloqueado}>Ya habilitado en otro equipo</span>
                ) : (
                  <span className={styles.rolIntegrante}>
                    {integrante.rolesEquipo
                      .map((rol) => obtenerEtiqueta('integranteEquipo.rolEquipo', rol).etiqueta)
                      .join(' · ')}
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <button
        type="button"
        className={styles.botonPrincipal}
        onClick={confirmar}
        disabled={enviando || seleccionados.size === 0}
      >
        {enviando ? 'Confirmando…' : 'Confirmar lista'}
      </button>
    </div>
  );
}
