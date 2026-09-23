'use client';

import { useState } from 'react';
import { useAvisos } from '@/components/avisos/Avisos';
import styles from './BotonVerificarOrganizacion.module.css';

export interface BotonVerificarOrganizacionProps {
  organizacionId: string;
  /**
   * Solo el Titular puede pedir la verificación (`10`, 4.2). Un
   * Administrador ve qué falta y a quién pedírselo, no un botón que le
   * va a responder que no.
   */
  soyTitular: boolean;
  /** «Verificar ahora» al publicar; «Verificar organización» en el panel. */
  etiqueta?: string;
  variante?: 'principal' | 'secundaria';
}

/**
 * Pedir la verificación básica de la organización, desde donde haga
 * falta (`06`, D-51 y D-76).
 *
 * Es un componente y no el botón de cada pantalla porque D-51 obliga a
 * ofrecer la verificación **en el momento en que se da la noticia** —al
 * publicar, sobre todo—, y ese momento pasa en más de un lugar: el
 * último paso del alta, el panel de gestión del torneo y la lista de
 * organizaciones. Con un botón por pantalla, el texto y el manejo del
 * error se iban a separar solos.
 *
 * El resultado va al avisador y no a un `<p>` acá abajo: el pedido
 * termina en un correo, así que lo único que hay para mostrar es que
 * salió, y eso no merece ocupar lugar fijo en el formulario.
 */
export function BotonVerificarOrganizacion({
  organizacionId,
  soyTitular,
  etiqueta = 'Verificar ahora',
  variante = 'principal',
}: BotonVerificarOrganizacionProps) {
  const avisos = useAvisos();
  const [enviando, setEnviando] = useState(false);

  if (!soyTitular) {
    return (
      <p className={styles.soloTitular}>
        La verificación la pide quien creó la organización, desde su cuenta.
      </p>
    );
  }

  async function pedirVerificacion() {
    setEnviando(true);
    const enCurso = avisos.cargando('Enviando el enlace…');
    try {
      const respuesta = await fetch('/api/organizaciones/solicitar-verificacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizacionId }),
      });
      const cuerpo = await respuesta.json();
      // `fetch` no lanza con 4xx ni 5xx: sin este chequeo, un rechazo
      // del servidor se veía como un envío exitoso.
      if (!respuesta.ok || !cuerpo?.ok) {
        avisos.error(cuerpo?.error?.mensaje ?? 'No pudimos enviar el enlace.', enCurso);
        return;
      }
      avisos.exito('Te mandamos el enlace — revisá tu correo.', enCurso);
    } catch {
      avisos.error('No pudimos conectar. Probá de nuevo.', enCurso);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button
      type="button"
      className={variante === 'principal' ? styles.principal : styles.secundaria}
      onClick={pedirVerificacion}
      disabled={enviando}
    >
      {enviando ? 'Enviando…' : etiqueta}
    </button>
  );
}
