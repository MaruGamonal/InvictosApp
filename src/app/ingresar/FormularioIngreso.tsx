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

interface SeguirPendiente {
  tipoSeguido: 'tournament' | 'team';
  entidadId: string;
}

interface Props {
  modoInicial: 'ingresar' | 'crear';
  seguirPendiente?: SeguirPendiente | null;
}

function conSeguirPendiente(href: string, seguirPendiente?: SeguirPendiente | null): string {
  if (!seguirPendiente) return href;
  const separador = href.includes('?') ? '&' : '?';
  return `${href}${separador}accion=seguir&tipoSeguido=${seguirPendiente.tipoSeguido}&entidadId=${seguirPendiente.entidadId}`;
}

export function FormularioIngreso({ modoInicial, seguirPendiente }: Props) {
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
            ? {
                identificadorAcceso,
                nombreVisible,
                password,
                accionPendiente: seguirPendiente
                  ? { tipo: 'seguir', datos: seguirPendiente }
                  : undefined,
              }
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

      if (seguirPendiente) {
        // Crear cuenta ya la deja siguiendo (accionPendiente, arriba); acá
        // se repite para ingresar (sesión ya existente, sin ese enganche) —
        // es idempotente, así que no hace nada de más en el otro caso.
        await fetch('/api/seguir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(seguirPendiente),
        }).catch(() => {});
        window.location.assign(
          seguirPendiente.tipoSeguido === 'tournament'
            ? `/torneo/${seguirPendiente.entidadId}`
            : `/equipo/${seguirPendiente.entidadId}`,
        );
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
            ¿Ya tenés cuenta?{' '}
            <Link href={conSeguirPendiente('/ingresar', seguirPendiente)}>Ingresá</Link>
          </>
        ) : (
          <>
            ¿No tenés cuenta?{' '}
            <Link href={conSeguirPendiente('/ingresar?modo=crear', seguirPendiente)}>
              Creala en un momento
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
