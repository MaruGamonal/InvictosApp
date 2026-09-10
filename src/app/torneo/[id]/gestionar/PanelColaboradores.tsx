'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { EstadoVacio } from '@/components/EstadoVacio';
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
 * UC-52 — Colaboradores de este torneo puntual: solo pueden cargar
 * resultados, programar partidos y registrar no disputados en este
 * torneo — nada más (`06`, D-32). El vínculo es con el torneo, no con
 * la organización: sacar a alguien de acá no lo saca de otros torneos
 * donde también colabore.
 */
export function PanelColaboradores({ torneoId, colaboradores }: PanelColaboradoresProps) {
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
      const respuesta = await fetch('/api/torneos/invitar-colaborador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, email, nombreCompleto: nombreCompleto || undefined }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        if (cuerpo?.error?.detalle?.[0]?.campo === 'nombreCompleto') {
          setPideNombre(true);
          setError('Es una persona nueva en la plataforma — hace falta su nombre.');
        } else {
          setError(cuerpo?.error?.mensaje ?? 'No se pudo asignar. Probá de nuevo.');
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
      const respuesta = await fetch('/api/torneos/quitar-colaborador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId, usuarioId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo sacar al colaborador.');
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

      {colaboradores.length === 0 ? (
        <EstadoVacio mensaje="Este torneo todavía no tiene colaboradores asignados." />
      ) : (
        colaboradores.map((colaborador) => (
          <div key={colaborador.usuarioId} className={styles.filaIntegranteCabecera}>
            <span className={styles.nombreIntegrante}>{colaborador.nombreVisible}</span>
            <button
              type="button"
              className={styles.botonPeligroChico}
              onClick={() => quitar(colaborador.usuarioId)}
              disabled={quitando !== null}
            >
              {quitando === colaborador.usuarioId ? 'Sacando…' : 'Quitar'}
            </button>
          </div>
        ))
      )}

      <form className={styles.formularioChico} onSubmit={invitar}>
        <input
          type="email"
          required
          placeholder="Email de la persona"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
        />
        {pideNombre && (
          <input
            type="text"
            required
            placeholder="Nombre completo"
            value={nombreCompleto}
            onChange={(evento) => setNombreCompleto(evento.target.value)}
          />
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Asignando…' : 'Asignar colaborador'}
        </button>
      </form>

      <p className={styles.avisoChico}>
        El vínculo es con este torneo, no con la organización. Sacarlo de acá no lo saca de otros
        torneos donde también colabore.
      </p>
    </div>
  );
}
