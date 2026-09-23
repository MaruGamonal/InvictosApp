'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/Badge';
import type { MiembroListado } from '@/services/organizadores/listarMiembros';
import styles from './pagina.module.css';

export interface ListaEquipoDeTrabajoProps {
  organizacionId: string;
  miembros: MiembroListado[];
  /** Solo el Titular puede sacar Administradores (`06`, D-64). */
  esTitular: boolean;
}

/**
 * UC-07 — Pantalla dedicada del Equipo de trabajo (distinta del panel
 * embebido en `torneo/[id]/gestionar/configuracion`, que sigue
 * existiendo tal cual): acá "Invitar administrador" es un enlace a su
 * propia pantalla en vez de un formulario inline.
 */
export function ListaEquipoDeTrabajo({
  organizacionId,
  miembros,
  esTitular,
}: ListaEquipoDeTrabajoProps) {
  const router = useRouter();
  const [quitando, setQuitando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function quitar(usuarioId: string) {
    setQuitando(usuarioId);
    setError(null);
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
    <div className={styles.contenidoPagina}>
      <div className={styles.filaCabecera}>
        <h1 className={styles.titulo}>Equipo de trabajo</h1>
      </div>

      <p className={styles.ayuda}>
        Quienes administran la organización con vos: pueden crear y gestionar sus torneos.
      </p>

      {/*
        Reportado en vivo — "no tengo cómo invitar colaboradores al
        equipo de trabajo". Era un enlace de 13px en un rincón de la
        cabecera, y para quien no es Titular directamente no estaba, sin
        decir por qué: esconder algo sin explicarlo se siente igual que
        si no existiera.
      */}
      {esTitular ? (
        <Link href="/organizador/gestionar/invitar" className={styles.botonInvitar}>
          + Invitar Administrador
        </Link>
      ) : (
        <p className={styles.ayudaSinPermiso}>
          Solo el Titular de la organización puede sumar Administradores. Pedíselo a quien la creó.
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.lista}>
        {miembros.map((persona) => (
          <div key={persona.usuarioId} className={styles.fila}>
            <div className={styles.info}>
              <span className={styles.nombre}>{persona.nombreCompleto}</span>
              <span className={styles.email}>{persona.email}</span>
              <div className={styles.badges}>
                <Badge campo="miembroOrganizacion.rol" valor={persona.rol} />
                {persona.estado !== 'active' && (
                  <Badge campo="usuario.estado" valor={persona.estado} />
                )}
              </div>
            </div>
            {esTitular && persona.rol === 'admin' && (
              <button
                type="button"
                className={styles.botonQuitar}
                onClick={() => quitar(persona.usuarioId)}
                disabled={quitando !== null}
              >
                {quitando === persona.usuarioId ? 'Quitando…' : 'Quitar'}
              </button>
            )}
          </div>
        ))}
      </div>

      {!esTitular && (
        <p className={styles.aviso}>
          Solo el Titular puede sumar o sacar administradores de la organización.
        </p>
      )}
    </div>
  );
}
