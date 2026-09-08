'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import styles from '../ingresar/pagina.module.css';

type Estado =
  | { paso: 'formulario' }
  | { paso: 'enviando' }
  | { paso: 'enviado' }
  | { paso: 'error'; mensaje: string };

export function FormularioRecuperacion() {
  const [estado, setEstado] = useState<Estado>({ paso: 'formulario' });
  const [identificadorAcceso, setIdentificadorAcceso] = useState('');

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado({ paso: 'enviando' });

    try {
      const respuesta = await fetch('/api/recuperar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificadorAcceso }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setEstado({
          paso: 'error',
          mensaje: cuerpo?.error?.mensaje ?? 'No pudimos enviar el enlace. Probá de nuevo.',
        });
        return;
      }

      setEstado({ paso: 'enviado' });
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
        <h1 className={`fuente-display ${styles.titulo}`}>Te mandamos un link</h1>
        <p className={styles.texto}>
          Revisá <strong>{identificadorAcceso}</strong>. El link para elegir una contraseña nueva
          vence en 30 minutos.
        </p>
        <div className={styles.textoCentrado}>
          <Link href="/ingresar">Volver a ingresar</Link>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Recuperar acceso</h1>
      <p className={styles.texto}>
        Escribí el correo de tu cuenta y te mandamos un link para elegir una contraseña nueva.
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

      <button type="submit" className={styles.boton} disabled={estado.paso === 'enviando'}>
        {estado.paso === 'enviando' ? 'Enviando…' : 'Enviar link'}
      </button>
    </form>
  );
}
