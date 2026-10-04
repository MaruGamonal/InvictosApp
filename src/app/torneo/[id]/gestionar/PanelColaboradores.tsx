'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EstadoVacio } from '@/components/EstadoVacio';
import { useInvitacionPorCorreo } from '@/components/useInvitacionPorCorreo';
import styles from './pagina.module.css';

export interface ColaboradorGestion {
  usuarioId: string;
  nombreVisible: string;
}

export interface PanelColaboradoresProps {
  torneoId: string;
  colaboradores: ColaboradorGestion[];
}

/**
 * El envío de la asignación es el mismo que el de invitar un
 * administrador, compartido en `useInvitacionPorCorreo`: cambia la ruta
 * de la API y el mensaje de fallo, nada más.
 *
 * UC-52 — Colaboradores de este torneo puntual: solo pueden cargar
 * resultados, programar partidos y registrar no disputados en este
 * torneo — nada más (`06`, D-32). Es una asignación por torneo, no por
 * organización: quitar a alguien de acá no lo saca de otros torneos
 * donde también colabore.
 */
export function PanelColaboradores({ torneoId, colaboradores }: PanelColaboradoresProps) {
  const router = useRouter();
  const [quitando, setQuitando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invitacion = useInvitacionPorCorreo({
    url: '/api/torneos/invitar-colaborador',
    datos: { torneoId },
    mensajeDeFallo: 'No pudimos asignar. Probá de nuevo.',
    alLograrlo: () => router.refresh(),
  });

  async function quitar(usuarioId: string) {
    setQuitando(usuarioId);
    setError(null);
    // El error de la otra acción no tiene por qué seguir ahí: las dos
    // se muestran en el mismo renglón.
    invitacion.limpiarError();
    try {
      const respuesta = await fetch('/api/torneos/quitar-colaborador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, usuarioId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos quitar al colaborador.');
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setQuitando(null);
    }
  }

  return (
    <div className={styles.lista}>
      {/* Dos orígenes, un solo lugar donde se ve: quitar tiene su propio
          estado y el de asignar lo lleva el hook. */}
      {(error ?? invitacion.error) && (
        <p className={styles.errorChico}>{error ?? invitacion.error}</p>
      )}

      {colaboradores.length === 0 ? (
        <EstadoVacio mensaje="Este torneo todavía no tiene colaboradores asignados." />
      ) : (
        colaboradores.map((colaborador) => (
          <div key={colaborador.usuarioId} className={styles.filaIntegranteCabecera}>
            <div className={styles.filaIntegranteInfo}>
              <span className={styles.nombreIntegrante}>{colaborador.nombreVisible}</span>
              {/* El rol va en la fila y no en un párrafo al pie: el
                  alcance —este torneo— ya lo dice el título del
                  acordeón, y qué puede hacer es una etiqueta, no una
                  explicación. */}
              <div className={styles.filaBadgesRol}>
                <span className={styles.rolIntegrante}>Colaborador</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.botonPeligroChico}
              onClick={() => quitar(colaborador.usuarioId)}
              disabled={quitando !== null}
            >
              {quitando === colaborador.usuarioId ? 'Quitando…' : 'Quitar'}
            </button>
          </div>
        ))
      )}

      <form
        className={styles.formularioChico}
        onSubmit={(evento) => {
          setError(null);
          return invitacion.enviar(evento);
        }}
      >
        <input
          type="email"
          required
          placeholder="Correo de la persona"
          aria-label="Correo de la persona"
          value={invitacion.email}
          onChange={(evento) => invitacion.cambiarEmail(evento.target.value)}
        />
        {invitacion.pideNombre && (
          <input
            type="text"
            required
            placeholder="Nombre completo"
            aria-label="Nombre completo"
            value={invitacion.nombreCompleto}
            onChange={(evento) => invitacion.cambiarNombreCompleto(evento.target.value)}
          />
        )}
        <button type="submit" disabled={invitacion.enviando}>
          {invitacion.enviando ? 'Asignando…' : 'Asignar colaborador'}
        </button>
      </form>
    </div>
  );
}
