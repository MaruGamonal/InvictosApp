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

/**
 * Qué estaba haciendo la persona cuando le pedimos la cuenta (D-04b).
 *
 * `seguir` se puede ejecutar sola apenas hay sesión. `inscribir` no: el
 * redirect pasa antes de elegir equipo, y quien se acaba de registrar no
 * tiene ninguno. De esa sólo se retoma el lugar.
 */
export type AccionPendienteDeLaUrl =
  | { tipo: 'seguir'; tipoSeguido: 'tournament' | 'team'; entidadId: string }
  | { tipo: 'inscribir'; torneoId: string };

interface Props {
  modoInicial: 'ingresar' | 'crear';
  accionPendiente?: AccionPendienteDeLaUrl | null;
}

/** Mantiene la acción pendiente al alternar entre «Ingresar» y «Crear cuenta». */
function conAccionPendiente(href: string, accion?: AccionPendienteDeLaUrl | null): string {
  if (!accion) return href;
  const separador = href.includes('?') ? '&' : '?';
  const parametros =
    accion.tipo === 'seguir'
      ? `accion=seguir&tipoSeguido=${accion.tipoSeguido}&entidadId=${accion.entidadId}`
      : `accion=inscribir&torneoId=${accion.torneoId}`;
  return `${href}${separador}${parametros}`;
}

export function FormularioIngreso({ modoInicial, accionPendiente }: Props) {
  const [estado, setEstado] = useState<Estado>({ paso: 'formulario' });
  const esCrear = modoInicial === 'crear';
  const [identificadorAcceso, setIdentificadorAcceso] = useState('');
  const [nombreVisible, setNombreVisible] = useState('');
  const [password, setPassword] = useState('');
  const [recordarme, setRecordarme] = useState(true);

  // Reportado en vivo: con menos de 8 caracteres el botón seguía mostrándose
  // habilitado — el `minLength` del input alcanza para el envío nativo del
  // form, pero no avisaba nada mientras se escribía. Server-side ya lo
  // exige (`registrar.ts`, D-52); esto es solo la señal visual que faltaba.
  const passwordCorta = esCrear && password.length > 0 && password.length < 8;
  const formularioValido = esCrear
    ? nombreVisible.trim() !== '' && identificadorAcceso.trim() !== '' && password.length >= 8
    : identificadorAcceso.trim() !== '' && password.trim() !== '';

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
                // Solo `seguir` tiene ejecutor: es la única que se
                // puede completar sin preguntarle nada más a la persona.
                accionPendiente:
                  accionPendiente?.tipo === 'seguir'
                    ? {
                        tipo: 'seguir',
                        datos: {
                          tipoSeguido: accionPendiente.tipoSeguido,
                          entidadId: accionPendiente.entidadId,
                        },
                      }
                    : undefined,
              }
            : { identificadorAcceso, password, recordarme },
        ),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setEstado({
          paso: 'error',
          mensaje:
            cuerpo?.error?.mensaje ??
            (esCrear
              ? 'No pudimos crear la cuenta. Probá de nuevo.'
              : 'No pudimos completar el ingreso. Revisá el correo y la contraseña.'),
        });
        return;
      }

      if (accionPendiente?.tipo === 'seguir') {
        const seguir = {
          tipoSeguido: accionPendiente.tipoSeguido,
          entidadId: accionPendiente.entidadId,
        };
        // Crear cuenta ya la deja siguiendo (accionPendiente, arriba); acá
        // se repite para ingresar (sesión ya existente, sin ese enganche) —
        // es idempotente, así que no hace nada de más en el otro caso.
        await fetch('/api/seguir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(seguir),
        }).catch(() => {});
        window.location.assign(
          seguir.tipoSeguido === 'tournament'
            ? `/torneo/${seguir.entidadId}`
            : `/equipo/${seguir.entidadId}`,
        );
        return;
      }

      if (accionPendiente?.tipo === 'inscribir') {
        // No se inscribe nada acá: todavía no hay equipo elegido, y quien
        // se acaba de registrar no tiene ninguno. Se vuelve al torneo con
        // `?inscribir=1`, que reabre el panel donde había quedado.
        window.location.assign(`/torneo/${accionPendiente.torneoId}?inscribir=1`);
        return;
      }

      window.location.assign(esCrear ? '/cuenta-creada' : '/inicio');
    } catch {
      setEstado({
        paso: 'error',
        mensaje: 'No pudimos conectar. Probá de nuevo.',
      });
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>{esCrear ? 'Crear cuenta' : 'Ingresar'}</h1>
      <p className={styles.texto}>
        {esCrear ? 'Solo lo justo para empezar.' : 'Con el correo y la contraseña de tu cuenta.'}
      </p>

      {estado.paso === 'error' && (
        <p className={styles.error} role="alert">
          {estado.mensaje}
        </p>
      )}

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
        {esCrear && (
          <span className={passwordCorta ? styles.ayudaAdvertencia : styles.ayuda}>
            {passwordCorta ? 'Todavía le faltan caracteres — mínimo 8.' : 'Al menos 8 caracteres.'}
          </span>
        )}
      </div>

      {!esCrear && (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={recordarme}
            onChange={(evento) => setRecordarme(evento.target.checked)}
          />
          Recordarme
        </label>
      )}

      <button
        type="submit"
        className={styles.boton}
        disabled={estado.paso === 'enviando' || !formularioValido}
      >
        {estado.paso === 'enviando' ? 'Enviando…' : esCrear ? 'Crear cuenta' : 'Ingresar'}
      </button>

      <div className={styles.textoCentrado}>
        {esCrear ? (
          <>
            ¿Ya tenés cuenta?{' '}
            <Link href={conAccionPendiente('/ingresar', accionPendiente)}>Ingresá</Link>
          </>
        ) : (
          <>
            ¿No tenés cuenta?{' '}
            <Link href={conAccionPendiente('/ingresar?modo=crear', accionPendiente)}>
              Creala en un momento
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
