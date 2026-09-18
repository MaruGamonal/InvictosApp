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
        {esTitular && (
          <Link href="/organizador/gestionar/invitar" className={styles.enlaceInvitar}>
            + Invitar admin
          </Link>
        )}
      </div>

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
