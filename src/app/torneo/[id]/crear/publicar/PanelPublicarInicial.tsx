'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BotonVerificarOrganizacion } from '@/components/BotonVerificarOrganizacion';
import styles from '@/app/ingresar/pagina.module.css';
import pasoStyles from './pagina.module.css';

interface Props {
  torneoId: string;
  organizacionId: string;
  soyTitular: boolean;
}

/**
 * UC-18 — Publicar el torneo: `draft → registration_open`.
 *
 * Publicar sin verificar **no falla**: el torneo nace no listado (`06`,
 * D-51). Lo que sí falla es el segundo torneo, por el límite de uno
 * publicado a la vez. Las dos situaciones terminan acá y las dos tienen
 * la misma obligación de diseño (`05`, sección 5): decir con precisión
 * qué pasó —el torneo existe y se comparte por link; lo que falta es
 * que aparezca en las búsquedas— y ofrecer la verificación **en este
 * mismo lugar**, que es el momento de mayor motivación del recorrido.
 *
 * Por eso el resultado no listado se queda en pantalla en vez de irse
 * como un aviso: es una noticia con algo que hacer, y este es el último
 * paso del alta — no hay nada más abajo que se desplace.
 */
export function PanelPublicarInicial({ torneoId, organizacionId, soyTitular }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codigoError, setCodigoError] = useState<string | null>(null);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [quedoNoListado, setQuedoNoListado] = useState(false);

  async function publicar() {
    setEnviando(true);
    setError(null);
    setCodigoError(null);
    setCamposFaltantes([]);
    try {
      const respuesta = await fetch('/api/torneos/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ torneoId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo publicar el torneo.');
        setCodigoError(typeof cuerpo?.error?.codigo === 'string' ? cuerpo.error.codigo : null);
        if (Array.isArray(cuerpo?.error?.detalle)) {
          const nombres = (cuerpo.error.detalle as Array<{ campo?: unknown }>)
            .map((item) => item?.campo)
            .filter((campo): campo is string => typeof campo === 'string');
          setCamposFaltantes(nombres);
        }
        setEnviando(false);
        return;
      }

      // Se publicó, pero no entró al descubrimiento. Mandar directo a la
      // gestión sería dar la noticia en una pantalla donde ya no se ve.
      if (cuerpo.data?.motivoNoListado === 'organizacion_no_verificada') {
        setQuedoNoListado(true);
        setEnviando(false);
        return;
      }

      router.push(`/torneo/${torneoId}/gestionar`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  if (quedoNoListado) {
    return (
      <div className={pasoStyles.resultado}>
        <p className={pasoStyles.avisoInfo}>
          <strong>Tu torneo está publicado.</strong> Se puede compartir por link y funciona
          completo: los equipos se inscriben, el fixture y la tabla andan igual. Lo único que falta
          es que aparezca en las búsquedas, y para eso hace falta verificar tu organización.
        </p>
        <div className={pasoStyles.filaAcciones}>
          <BotonVerificarOrganizacion organizacionId={organizacionId} soyTitular={soyTitular} />
          <Link href={`/torneo/${torneoId}/gestionar`} className={pasoStyles.enlaceSecundario}>
            Ir al torneo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <>
          <p className={pasoStyles.errorChico}>{error}</p>
          {camposFaltantes.length > 0 && (
            <p className={pasoStyles.errorChico}>
              Falta: {camposFaltantes.join(', ')}. Completalo desde{' '}
              <Link href={`/torneo/${torneoId}/gestionar/configuracion`}>Configuración</Link>.
            </p>
          )}
          {/* El límite se levanta verificando, así que la salida va acá. */}
          {codigoError === 'LIMITE_TORNEOS_PUBLICADOS' && (
            <div className={pasoStyles.filaAcciones}>
              <BotonVerificarOrganizacion
                organizacionId={organizacionId}
                soyTitular={soyTitular}
                variante="secundaria"
              />
            </div>
          )}
        </>
      )}
      <button type="button" className={styles.boton} onClick={publicar} disabled={enviando}>
        {enviando ? 'Publicando…' : 'Publicar'}
      </button>
    </div>
  );
}
