'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/Badge';
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
 */
export function PanelAdministradores({
  organizacionId,
  administradores,
  esTitular,
}: PanelAdministradoresProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [pideNombre, setPideNombre] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function invitar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/organizaciones/invitar-administrador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizacionId, email, nombreCompleto: nombreCompleto || undefined }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        if (cuerpo?.error?.detalle?.[0]?.campo === 'nombreCompleto') {
          setPideNombre(true);
          setError('Es una persona nueva en la plataforma — hace falta su nombre.');
        } else {
          setError(cuerpo?.error?.mensaje ?? 'No se pudo invitar. Probá de nuevo.');
        }
        setEnviando(false);
        return;
      }
      setEmail('');
      setNombreCompleto('');
      setPideNombre(false);
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

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
    <div className={styles.lista}>
      {error && <p className={styles.errorChico}>{error}</p>}

      {administradores.map((persona) => (
        <div key={persona.usuarioId} className={styles.filaIntegranteCabecera}>
          <div className={styles.filaIntegranteInfo}>
            <span className={styles.nombreIntegrante}>{persona.nombreCompleto}</span>
            <div className={styles.filaBadgesRol}>
              <Badge campo="miembroOrganizacion.rol" valor={persona.rol} />
              {persona.estado !== 'active' && <Badge campo="usuario.estado" valor={persona.estado} />}
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

      {esTitular ? (
        <>
          <form className={styles.formularioChico} onSubmit={invitar}>
            <input
              type="email"
              required
              placeholder="Email de la persona"
              aria-label="Email de la persona"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
            />
            {pideNombre && (
              <input
                type="text"
                required
                placeholder="Nombre completo"
                aria-label="Nombre completo"
                value={nombreCompleto}
                onChange={(evento) => setNombreCompleto(evento.target.value)}
              />
            )}
            <button type="submit" disabled={enviando}>
              {enviando ? 'Invitando…' : 'Invitar administrador'}
            </button>
          </form>
          <p className={styles.avisoChico}>
            Un Administrador opera sobre todos los torneos de la organización, igual que vos —
            salvo que no puede sumar ni sacar administradores.
          </p>
        </>
      ) : (
        <p className={styles.avisoChico}>
          Solo el Titular puede sumar o sacar administradores de la organización.
        </p>
      )}
    </div>
  );
}
