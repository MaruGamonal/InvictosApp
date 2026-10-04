'use client';

import { useState, type FormEvent } from 'react';

/**
 * Invitar a alguien por su correo: el estado y el envío, compartidos.
 *
 * Los tres formularios que hacen esto —administrador desde el panel del
 * torneo, administrador desde su pantalla propia, y colaborador— tenían
 * cada uno su copia de lo mismo: los dos campos, el `pideNombre`, el
 * `fetch`, y la lectura del error que distingue "no pudimos" de "esta
 * persona todavía no tiene cuenta". Tres copias de una lectura de error
 * tan puntual como `error.detalle[0].campo === 'nombreCompleto'` se
 * separan al primer cambio del backend, y las dos que no se tocan
 * quedan mostrando el mensaje equivocado sin que nadie se entere.
 *
 * Es un hook y no un componente porque lo que se repite es la lógica,
 * no la pantalla: una de las tres es una página con etiquetas visibles
 * y las otras dos son formularios dentro de un acordeón, con
 * `aria-label` y `placeholder`. Un componente compartido habría obligado
 * a las tres a verse igual.
 */

/**
 * Lo que responde el servidor cuando la persona invitada no tiene
 * cuenta: hace falta su nombre para crearla. No es un error de la
 * persona que invita, así que se dice distinto de un fallo.
 */
const MENSAJE_PERSONA_NUEVA = 'Es una persona nueva en la plataforma — hace falta su nombre.';

export interface OpcionesDeInvitacion {
  /** La ruta de la API que manda la invitación. */
  url: string;
  /** Lo que acompaña al correo en el cuerpo: `organizacionId` o `torneoId`. */
  datos: Record<string, string>;
  /** Qué decir si el servidor falla sin dar un mensaje propio. */
  mensajeDeFallo: string;
  /** Qué hacer cuando salió bien: refrescar la lista, o navegar. */
  alLograrlo: () => void;
}

export interface InvitacionPorCorreo {
  email: string;
  cambiarEmail: (valor: string) => void;
  nombreCompleto: string;
  cambiarNombreCompleto: (valor: string) => void;
  /** `true` cuando el servidor pidió el nombre: recién ahí se muestra ese campo. */
  pideNombre: boolean;
  enviando: boolean;
  error: string | null;
  /**
   * Borra el error de la invitación. Lo usa quien comparte el lugar
   * donde se muestra: en los paneles, quitar a alguien tiene su propio
   * error, y sin esto el de una acción quedaría tapando al de la otra.
   */
  limpiarError: () => void;
  enviar: (evento: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useInvitacionPorCorreo(opciones: OpcionesDeInvitacion): InvitacionPorCorreo {
  const [email, cambiarEmail] = useState('');
  const [nombreCompleto, cambiarNombreCompleto] = useState('');
  const [pideNombre, setPideNombre] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const respuesta = await fetch(opciones.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...opciones.datos,
          email,
          nombreCompleto: nombreCompleto || undefined,
        }),
      });
      const cuerpo = await respuesta.json();

      // `fetch` no lanza con 4xx ni 5xx: sin este chequeo, un rechazo
      // del servidor se vería como una invitación mandada.
      if (!respuesta.ok || !cuerpo?.ok) {
        if (cuerpo?.error?.detalle?.[0]?.campo === 'nombreCompleto') {
          setPideNombre(true);
          setError(MENSAJE_PERSONA_NUEVA);
        } else {
          setError(cuerpo?.error?.mensaje ?? opciones.mensajeDeFallo);
        }
        setEnviando(false);
        return;
      }

      // Se limpia antes de avisar: `alLograrlo` puede navegar a otra
      // pantalla, y tocar el estado de un componente ya desmontado no
      // sirve para nada.
      cambiarEmail('');
      cambiarNombreCompleto('');
      setPideNombre(false);
      setEnviando(false);
      opciones.alLograrlo();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return {
    email,
    cambiarEmail,
    nombreCompleto,
    cambiarNombreCompleto,
    pideNombre,
    enviando,
    error,
    limpiarError: () => setError(null),
    enviar,
  };
}
