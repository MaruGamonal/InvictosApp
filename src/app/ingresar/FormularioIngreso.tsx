'use client';

import { useState, type FormEvent } from 'react';
import styles from './pagina.module.css';

/**
 * UC-01, primera mitad — cliente del `POST /api/registro`. Un solo
 * formulario para ingresar y para crear cuenta (D-52: passwordless, alta
 * mínima) — no hay credencial que "no coincida", así que no hay dos
 * pantallas separadas como en un flujo con contraseña.
 */
type Estado =
  | { paso: 'formulario' }
  | { paso: 'enviando' }
  | { paso: 'enviado'; correo: string }
  | { paso: 'error'; mensaje: string };

export function FormularioIngreso() {
  const [estado, setEstado] = useState<Estado>({ paso: 'formulario' });
  const [identificadorAcceso, setIdentificadorAcceso] = useState('');
  const [nombreVisible, setNombreVisible] = useState('');

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado({ paso: 'enviando' });

    try {
      const respuesta = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificadorAcceso, nombreVisible }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setEstado({
          paso: 'error',
          mensaje: cuerpo?.error?.mensaje ?? 'No pudimos enviar el enlace. Probá de nuevo.',
        });
        return;
      }

      setEstado({ paso: 'enviado', correo: identificadorAcceso });
    } catch {
      setEstado({
        paso: 'error',
        mensaje: 'No pudimos conectar. Revisá tu conexión e intentá de nuevo.',
      });
    }
  }

  if (estado.paso === 'enviado') {
    return (
      <div className={styles.tarjeta}>
        <h1 className={`fuente-display ${styles.titulo}`}>Te mandamos un enlace</h1>
        <p className={styles.texto}>
          Revisá <strong>{estado.correo}</strong>. Tocá el enlace para entrar — no hace falta
          contraseña.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Ingresar</h1>
      <p className={styles.texto}>
        Escribí tu correo y te mandamos un enlace para entrar. Si todavía no tenés cuenta, se crea
        sola con esto.
      </p>

      {estado.paso === 'error' && <p className={styles.error}>{estado.mensaje}</p>}

      <div className={styles.campo}>
        <label htmlFor="identificadorAcceso">Correo</label>
        <input
          id="identificadorAcceso"
          type="email"
          required
          placeholder="vos@ejemplo.com"
          value={identificadorAcceso}
          onChange={(evento) => setIdentificadorAcceso(evento.target.value)}
        />
      </div>

      <div className={styles.campo}>
        <label htmlFor="nombreVisible">Nombre visible</label>
        <input
          id="nombreVisible"
          type="text"
          required
          placeholder="Cómo te van a ver los demás"
          value={nombreVisible}
          onChange={(evento) => setNombreVisible(evento.target.value)}
        />
        <span className={styles.ayuda}>
          Si ya tenés cuenta, no hace falta que coincida — se ignora.
        </span>
      </div>

      <button type="submit" className={styles.boton} disabled={estado.paso === 'enviando'}>
        {estado.paso === 'enviando' ? 'Enviando…' : 'Mandarme el enlace'}
      </button>
    </form>
  );
}
