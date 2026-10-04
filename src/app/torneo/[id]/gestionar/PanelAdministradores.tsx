'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/Badge';
import { useInvitacionPorCorreo } from '@/components/useInvitacionPorCorreo';
import { DESCRIPCION_ADMINISTRADOR } from '@/lib/rolesDeOrganizacion';
import styles from './pagina.module.css';

export interface AdministradorGestion {
  usuarioId: string;
  nombreCompleto: string;
  email: string;
  rol: 'owner' | 'admin';
  estado: 'invited' | 'active' | 'inactive';
}

export interface PanelAdministradoresProps {
  organizacionId: string;
  administradores: AdministradorGestion[];
  /** Solo el Titular puede sumar o sacar Administradores (`06`, D-64). */
  esTitular: boolean;
}

/**
 * UC-07 — Equipo de trabajo de la organización: a diferencia de los
 * colaboradores de `PanelColaboradores` (por torneo puntual), un
 * Administrador opera sobre **todos** los torneos de la organización.
 * Solo el Titular puede sumarlos o sacarlos; un Administrador ve la
 * lista pero no puede tocarla (`06`, D-64).
 *
 * El envío de la invitación es el mismo de la pantalla dedicada
 * (`organizador/gestionar/invitar`), compartido en
 * `useInvitacionPorCorreo`: acá el formulario vive dentro de un
 * acordeón y al terminar refresca la lista en el lugar; allá es una
 * pantalla propia que vuelve al Equipo de trabajo.
 */
export function PanelAdministradores({
  organizacionId,
  administradores,
  esTitular,
}: PanelAdministradoresProps) {
  const router = useRouter();
  const [quitando, setQuitando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invitacion = useInvitacionPorCorreo({
    url: '/api/organizaciones/invitar-administrador',
    datos: { organizacionId },
    mensajeDeFallo: 'No pudimos invitar. Probá de nuevo.',
    alLograrlo: () => router.refresh(),
  });

  async function quitar(usuarioId: string) {
    setQuitando(usuarioId);
    setError(null);
    // El error de la otra acción no tiene por qué seguir ahí: las dos
    // se muestran en el mismo renglón.
    invitacion.limpiarError();
    try {
      const respuesta = await fetch('/api/organizaciones/quitar-administrador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizacionId, usuarioId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No pudimos quitar al administrador.');
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
          estado y el de invitar lo lleva el hook. */}
      {(error ?? invitacion.error) && (
        <p className={styles.errorChico}>{error ?? invitacion.error}</p>
      )}

      {administradores.map((persona) => (
        <div key={persona.usuarioId} className={styles.filaIntegranteCabecera}>
          <div className={styles.filaIntegranteInfo}>
            <span className={styles.nombreIntegrante}>{persona.nombreCompleto}</span>
            <div className={styles.filaBadgesRol}>
              <Badge campo="miembroOrganizacion.rol" valor={persona.rol} />
              {persona.estado !== 'active' && (
                <Badge campo="usuario.estado" valor={persona.estado} />
              )}
            </div>
          </div>
          {esTitular && persona.rol === 'admin' && (
            <button
              type="button"
              className={styles.botonPeligroChico}
              onClick={() => quitar(persona.usuarioId)}
              disabled={quitando !== null}
            >
              {quitando === persona.usuarioId ? 'Quitando…' : 'Quitar'}
            </button>
          )}
        </div>
      ))}

      {esTitular && (
        <>
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
              {invitacion.enviando ? 'Invitando…' : 'Invitar administrador'}
            </button>
          </form>
          <p className={styles.avisoChico}>{DESCRIPCION_ADMINISTRADOR}</p>
        </>
      )}
    </div>
  );
}
