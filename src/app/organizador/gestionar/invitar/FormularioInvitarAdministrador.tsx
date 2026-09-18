'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../../ingresar/pagina.module.css';

interface Props {
  organizacionId: string;
}

/**
 * UC-07 — Pantalla dedicada de "Invitar Administrador" (distinta del
 * formulario inline de `PanelAdministradores`, que sigue existiendo en
 * `torneo/[id]/gestionar/configuracion` tal cual): mismo
 * `POST /api/organizaciones/invitar-administrador`, con su propia
 * pantalla y confirmación al volver al Equipo de trabajo.
 */
export function FormularioInvitarAdministrador({ organizacionId }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [pideNombre, setPideNombre] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch('/api/organizaciones/invitar-administrador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizacionId,
          email,
          nombreCompleto: nombreCompleto || undefined,
        }),
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
      router.push('/organizador/gestionar/equipo');
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Invitar Administrador</h1>
      <p className={styles.texto}>
        Un Administrador opera sobre todos los torneos de la organización, igual que vos — salvo que
        no puede sumar ni sacar administradores.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.campo}>
        <label htmlFor="email">Email de la persona</label>
        <input
          id="email"
          type="email"
          required
          placeholder="nombre@email.com"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
        />
      </div>

      {pideNombre && (
        <div className={styles.campo}>
          <label htmlFor="nombreCompleto">Nombre completo</label>
          <input
            id="nombreCompleto"
            type="text"
            required
            placeholder="Nombre y apellido"
            value={nombreCompleto}
            onChange={(evento) => setNombreCompleto(evento.target.value)}
          />
        </div>
      )}

      <button type="submit" className={styles.boton} disabled={enviando || !email.trim()}>
        {enviando ? 'Invitando…' : 'Invitar administrador'}
      </button>
    </form>
  );
}
