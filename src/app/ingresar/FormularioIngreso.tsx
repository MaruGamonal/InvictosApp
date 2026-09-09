'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CampoPassword } from '@/components/CampoPassword';
import styles from './pagina.module.css';

/**
 * UC-01 — cliente de `POST /api/ingresar` (correo + contraseña) y
 * `POST /api/registro` (nombre + correo + contraseña). Dos modos, dos
 * rutas distintas: a diferencia del flujo passwordless anterior, acá sí
 * hay una credencial que puede "no coincidir", así que ingresar y crear
 * cuenta son server-side dos operaciones distintas, no una sola.
 *
 * Crear cuenta deja la sesión abierta al toque (`FLOWS.md` Flujo 1: "No
 * se pide validar el correo acá") — por eso los dos modos terminan
 * igual, mandando a la siguiente pantalla del flujo en vez de mostrar un
 * estado intermedio de "confirmá tu correo".
 */
type Estado = { paso: 'formulario' } | { paso: 'enviando' } | { paso: 'error'; mensaje: string };

interface Props {
  modoInicial: 'ingresar' | 'crear';
}

export function FormularioIngreso({ modoInicial }: Props) {
  const [estado, setEstado] = useState<Estado>({ paso: 'formulario' });
  const esCrear = modoInicial === 'crear';
  const [identificadorAcceso, setIdentificadorAcceso] = useState('');
  const [nombreVisible, setNombreVisible] = useState('');
  const [password, setPassword] = useState('');

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado({ paso: 'enviando' });

    try {
      const respuesta = await fetch(esCrear ? '/api/registro' : '/api/ingresar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          esCrear
            ? { identificadorAcceso, nombreVisible, password }
            : { identificadorAcceso, password },
        ),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setEstado({
          paso: 'error',
          mensaje: cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.',
        });
        return;
      }

      window.location.assign(esCrear ? '/cuenta-creada' : '/inicio');
    } catch {
      setEstado({
        paso: 'error',
        mensaje: 'No pudimos conectar. Revisá tu conexión e intentá de nuevo.',
      });
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>{esCrear ? 'Crear cuenta' : 'Ingresar'}</h1>
      <p className={styles.texto}>
        {esCrear ? 'Solo lo justo para empezar.' : 'Con el correo y la contraseña de tu cuenta.'}
      </p>

      {estado.paso === 'error' && <p className={styles.error}>{estado.mensaje}</p>}

      {esCrear && (
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
        </div>
      )}

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
        <div className={styles.filaEtiqueta}>
          <label htmlFor="password">Contraseña</label>
          {!esCrear && (
            <Link href="/recuperar-password" className={styles.enlaceChico}>
              ¿La olvidaste?
            </Link>
          )}
        </div>
        <CampoPassword
          id="password"
          required
          minLength={esCrear ? 8 : undefined}
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          autoComplete={esCrear ? 'new-password' : 'current-password'}
        />
        {esCrear && <span className={styles.ayuda}>Al menos 8 caracteres.</span>}
      </div>

      <button type="submit" className={styles.boton} disabled={estado.paso === 'enviando'}>
        {estado.paso === 'enviando' ? 'Enviando…' : esCrear ? 'Crear cuenta' : 'Ingresar'}
      </button>

      <div className={styles.textoCentrado}>
        {esCrear ? (
          <>
            ¿Ya tenés cuenta? <Link href="/ingresar">Ingresá</Link>
          </>
        ) : (
          <>
            ¿No tenés cuenta? <Link href="/ingresar?modo=crear">Creala en un momento</Link>
          </>
        )}
      </div>
    </form>
  );
}
