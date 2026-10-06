'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BotonVerificarOrganizacion } from '@/components/BotonVerificarOrganizacion';
import { motivoDelFallo } from '@/components/avisos/motivoDelFallo';
import styles from './PanelPublicarTorneo.module.css';

export interface PanelPublicarTorneoProps {
  torneoId: string;
  organizacionId: string;
  soyTitular: boolean;
  organizacionVerificada: boolean;
  limitePublicadosAlcanzado: boolean;
  /** Datos mínimos todavía sin cargar (`obtenerResumenParaPublicar`). */
  camposFaltantes: string[];
  /** Adónde ir cuando el torneo entró al descubrimiento. Sin esto, se refresca donde está. */
  destinoAlPublicar?: string;
}

/**
 * UC-18 — Publicar el torneo: `draft → registration_open`.
 *
 * **Por qué es un componente.** Publicar pasaba en dos lugares con dos
 * calidades distintas. El último paso del alta explicaba D-51, ofrecía
 * verificar ahí mismo y decía qué datos faltaban; el botón "Publicar
 * torneo" del acordeón "Estado" de Configuración publicaba y tiraba un
 * aviso. Un torneo que quedaba en borrador y se retomaba después solo
 * tenía el segundo — o sea que la calidad del paso más importante del
 * producto dependía de en qué momento se llegaba a él. Ahora es el
 * mismo panel en los dos lados, y en Configuración ya no hay ninguno:
 * publicar es una decisión sobre el torneo, no un ajuste.
 *
 * Publicar sin verificar **no falla**: el torneo nace no listado (`06`,
 * D-51). Lo que sí falla es el segundo torneo, por el límite de uno
 * publicado a la vez. Las dos situaciones tienen la misma obligación de
 * diseño (`05`, sección 5): decir con precisión qué pasó —el torneo
 * existe y se comparte por link; lo que falta es que aparezca en las
 * búsquedas— y ofrecer la verificación **en este mismo lugar**, que es
 * el momento de mayor motivación del recorrido.
 *
 * Lo que falta para publicar se muestra **antes** de tocar el botón, no
 * como el error de un intento fallido: el dato sale de la misma lista
 * que valida `publicarTorneo`, así que la pantalla no puede prometer
 * que está todo cuando no lo está.
 */
export function PanelPublicarTorneo({
  torneoId,
  organizacionId,
  soyTitular,
  organizacionVerificada,
  limitePublicadosAlcanzado,
  camposFaltantes,
  destinoAlPublicar,
}: PanelPublicarTorneoProps) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoError, setCodigoError] = useState<string | null>(null);
  const [faltantesDelIntento, setFaltantesDelIntento] = useState<string[]>([]);
  const [quedoNoListado, setQuedoNoListado] = useState(false);

  // El servidor es el que decide: lo que haya devuelto el último intento
  // gana sobre lo que se leyó al renderizar la pantalla.
  const faltantes = faltantesDelIntento.length > 0 ? faltantesDelIntento : camposFaltantes;

  async function publicar() {
    setEnviando(true);
    setError(null);
    setCodigoError(null);
    setFaltantesDelIntento([]);
    try {
      const respuesta = await fetch('/api/torneos/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(motivoDelFallo(cuerpo, 'No pudimos publicar el torneo.'));
        setCodigoError(typeof cuerpo?.error?.codigo === 'string' ? cuerpo.error.codigo : null);
        if (Array.isArray(cuerpo?.error?.detalle)) {
          setFaltantesDelIntento(
            (cuerpo.error.detalle as Array<{ campo?: unknown }>)
              .map((item) => item?.campo)
              .filter((campo): campo is string => typeof campo === 'string'),
          );
        }
        setEnviando(false);
        return;
      }

      // Se publicó, pero no entró al descubrimiento. Irse de acá sería
      // dar la noticia en una pantalla donde ya no se ve.
      if (cuerpo.data?.motivoNoListado === 'organizacion_no_verificada') {
        setQuedoNoListado(true);
        setEnviando(false);
        return;
      }

      if (destinoAlPublicar) router.push(destinoAlPublicar);
      else router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  if (quedoNoListado) {
    return (
      <div className={styles.panel}>
        <p className={styles.avisoInfo}>
          <strong>Tu torneo está publicado.</strong> Todavía no aparece en las búsquedas: para eso,
          verificá tu organización.
        </p>
        <div className={styles.filaAcciones}>
          <BotonVerificarOrganizacion organizacionId={organizacionId} soyTitular={soyTitular} />
          <Link href={`/torneo/${torneoId}/gestionar`} className={styles.enlaceSecundario}>
            Ir al torneo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {organizacionVerificada ? (
        <p className={styles.avisoExito}>
          Tu organización está verificada: aparece en el descubrimiento apenas publiques.
        </p>
      ) : (
        /* D-51 pide ofrecer la verificación en el mismo lugar donde se da
           la noticia, no mandar a buscarla a otra pantalla. */
        <div className={styles.bloqueVerificacion}>
          <p className={styles.avisoInfo}>
            {limitePublicadosAlcanzado
              ? 'Ya tenés un torneo publicado. Verificá tu organización para publicar más de uno a la vez.'
              : 'Tu organización no está verificada: el torneo se comparte por enlace y funciona completo, pero no aparece en las búsquedas.'}
          </p>
          <BotonVerificarOrganizacion
            organizacionId={organizacionId}
            soyTitular={soyTitular}
            variante="secundaria"
          />
        </div>
      )}

      {faltantes.length > 0 && (
        <div className={styles.bloqueFaltantes}>
          <p className={styles.tituloFaltantes}>Para publicar todavía falta cargar:</p>
          <ul className={styles.listaFaltantes}>
            {faltantes.map((campo) => (
              <li key={campo}>{campo}</li>
            ))}
          </ul>
          <Link
            href={`/torneo/${torneoId}/gestionar/configuracion`}
            className={styles.enlaceSecundario}
          >
            Completar en Configuración
          </Link>
        </div>
      )}

      {error && (
        <>
          <p className={styles.error}>{error}</p>
          {/* El límite se levanta verificando, así que la salida va acá. */}
          {codigoError === 'LIMITE_TORNEOS_PUBLICADOS' && (
            <div className={styles.filaAcciones}>
              <BotonVerificarOrganizacion
                organizacionId={organizacionId}
                soyTitular={soyTitular}
                variante="secundaria"
              />
            </div>
          )}
        </>
      )}

      <button
        type="button"
        className={styles.boton}
        onClick={publicar}
        disabled={enviando || faltantes.length > 0}
      >
        {enviando ? 'Publicando…' : 'Publicar torneo'}
      </button>
    </div>
  );
}
