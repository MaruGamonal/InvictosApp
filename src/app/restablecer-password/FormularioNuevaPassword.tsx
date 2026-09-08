'use client';

import { useState, type FormEvent } from 'react';
import styles from '../ingresar/pagina.module.css';

type Estado = { paso: 'formulario' } | { paso: 'enviando' } | { paso: 'error'; mensaje: string };

export function FormularioNuevaPassword() {
  const [estado, setEstado] = useState<Estado>({ paso: 'formulario' });
  const [password, setPassword] = useState('');

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado({ paso: 'enviando' });

    try {
      const respuesta = await fetch('/api/restablecer-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setEstado({
          paso: 'error',
          mensaje:
            cuerpo?.error?.mensaje ??
            'No pudimos actualizar la contraseña. Pedí un nuevo link e intentá de nuevo.',
        });
        return;
      }

      window.location.assign('/torneos');
    } catch {
      setEstado({
        paso: 'error',
        mensaje: 'No pudimos conectar. Revisá tu conexión e intentá de nuevo.',
      });
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Elegí una contraseña nueva</h1>
      <p className={styles.texto}>Reemplaza la anterior en toda tu cuenta.</p>

      {estado.paso === 'error' && <p className={styles.error}>{estado.mensaje}</p>}

      <div className={styles.campo}>
        <label htmlFor="password">Contraseña nueva</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          placeholder="••••••••"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
        />
        <span className={styles.ayuda}>Al menos 8 caracteres.</span>
      </div>

      <button type="submit" className={styles.boton} disabled={estado.paso === 'enviando'}>
        {estado.paso === 'enviando' ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  );
}
