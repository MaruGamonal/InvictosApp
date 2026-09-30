'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

export interface PanelResponderResultadoProps {
  partidoId: string;
  torneoId: string;
  estadoResultado: 'pending' | 'loaded' | 'confirmed' | 'disputed';
  puedeResponder: boolean;
  puedeResolverObjecion: boolean;
  confirmaSoloEl: string | null;
}

type Paso =
  | { tipo: 'inicial' }
  | { tipo: 'objetando' }
  | { tipo: 'resolviendo' }
  | { tipo: 'enviando' }
  | { tipo: 'listo'; mensaje: string }
  | { tipo: 'error'; mensaje: string; volverA: 'inicial' | 'objetando' | 'resolviendo' };

const MINIMO_MOTIVO = 10;

const FORMATO_PLAZO = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Lo que se puede hacer con un resultado cargado, según quién mire.
 *
 * Dos caminos que no se cruzan: el equipo que no cargó confirma u
 * objeta; quien organiza resuelve una objeción abierta. Los dos
 * booleanos los decide el servidor (`obtenerPartido`), y los servicios
 * vuelven a verificar el permiso por su cuenta — esconder un botón no
 * impide que a la API se le pegue directo.
 *
 * El estado vive en el control que lo produjo: al confirmar, el bloque
 * pasa a decir que quedó firme, en vez de insertar un cartel abajo que
 * corra la pantalla justo después de tocar.
 */
export function PanelResponderResultado({
  partidoId,
  torneoId,
  estadoResultado,
  puedeResponder,
  puedeResolverObjecion,
  confirmaSoloEl,
}: PanelResponderResultadoProps) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>({ tipo: 'inicial' });
  const [texto, setTexto] = useState('');

  async function enviar(
    url: string,
    cuerpo: Record<string, unknown>,
    mensaje: string,
    volverA: 'inicial' | 'objetando' | 'resolviendo',
  ) {
    setPaso({ tipo: 'enviando' });
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const datos = await respuesta.json();
      // `fetch` no lanza con 4xx: sin este chequeo, un rechazo del
      // servidor se mostraría como éxito.
      if (!respuesta.ok || !datos.ok) {
        setPaso({
          tipo: 'error',
          mensaje: datos?.error?.mensaje ?? 'No pudimos completar la acción. Probá de nuevo.',
          volverA,
        });
        return;
      }
      setPaso({ tipo: 'listo', mensaje });
      router.refresh();
    } catch {
      setPaso({ tipo: 'error', mensaje: 'No pudimos conectar. Probá de nuevo.', volverA });
    }
  }

  if (paso.tipo === 'listo') {
    return <p className={styles.exito}>{paso.mensaje}</p>;
  }

  if (paso.tipo === 'error') {
    return (
      <div className={styles.bloqueAccion}>
        <p className={styles.error}>{paso.mensaje}</p>
        <button
          type="button"
          className={styles.botonSecundario}
          onClick={() => setPaso({ tipo: paso.volverA })}
        >
          Probar de nuevo
        </button>
      </div>
    );
  }

  if (paso.tipo === 'objetando' || paso.tipo === 'resolviendo') {
    const esObjecion = paso.tipo === 'objetando';
    return (
      <div className={styles.bloqueAccion}>
        <label className={styles.etiqueta} htmlFor="motivo">
          {esObjecion ? 'Contá qué no coincide' : 'Contá por qué queda firme'}
        </label>
        <textarea
          id="motivo"
          className={styles.area}
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={esObjecion ? 'El resultado fue 2 a 2, no 3 a 1.' : 'Revisé la planilla.'}
        />
        {texto.trim().length < MINIMO_MOTIVO && (
          <span className={styles.ayuda}>Al menos {MINIMO_MOTIVO} caracteres.</span>
        )}
        <div className={styles.filaBotones}>
          <button
            type="button"
            className={styles.botonSecundario}
            onClick={() => setPaso({ tipo: 'inicial' })}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.boton}
            disabled={texto.trim().length < MINIMO_MOTIVO}
            onClick={() =>
              esObjecion
                ? enviar(
                    '/api/partidos/objetar-resultado',
                    { partidoId, motivo: texto.trim() },
                    'Objeción enviada. La resuelve quien organiza el torneo.',
                    'objetando',
                  )
                : enviar(
                    '/api/partidos/resolver-objecion',
                    { partidoId, resolucion: texto.trim() },
                    'Resultado confirmado. La objeción quedó resuelta.',
                    'resolviendo',
                  )
            }
          >
            {esObjecion ? 'Enviar objeción' : 'Confirmar el resultado'}
          </button>
        </div>
      </div>
    );
  }

  const enviando = paso.tipo === 'enviando';

  if (puedeResolverObjecion) {
    return (
      <div className={styles.bloqueAccion}>
        <p className={styles.texto}>
          Podés dejar el resultado como está, o corregirlo desde Resultados: corregirlo también
          cierra la objeción.
        </p>
        <div className={styles.filaBotones}>
          <a href={`/torneo/${torneoId}/gestionar/resultados`} className={styles.botonSecundario}>
            Corregir el resultado
          </a>
          <button
            type="button"
            className={styles.boton}
            disabled={enviando}
            onClick={() => {
              setTexto('');
              setPaso({ tipo: 'resolviendo' });
            }}
          >
            Dejarlo como está
          </button>
        </div>
      </div>
    );
  }

  if (puedeResponder) {
    return (
      <div className={styles.bloqueAccion}>
        {confirmaSoloEl && (
          <p className={styles.texto}>
            Queda firme el {FORMATO_PLAZO.format(new Date(confirmaSoloEl))} si no respondés.
          </p>
        )}
        <div className={styles.filaBotones}>
          <button
            type="button"
            className={styles.botonSecundario}
            disabled={enviando}
            onClick={() => {
              setTexto('');
              setPaso({ tipo: 'objetando' });
            }}
          >
            No coincide
          </button>
          <button
            type="button"
            className={styles.boton}
            disabled={enviando}
            onClick={() =>
              enviar(
                '/api/partidos/confirmar-resultado',
                { partidoId },
                'Resultado confirmado.',
                'inicial',
              )
            }
          >
            {enviando ? 'Confirmando…' : 'Confirmar resultado'}
          </button>
        </div>
      </div>
    );
  }

  // Sin nada que hacer: se dice en qué estado está, que es lo único
  // que le sirve a quien mira de afuera.
  if (estadoResultado === 'loaded' && confirmaSoloEl) {
    return (
      <p className={styles.texto}>
        Resultado cargado, esperando confirmación. Queda firme el{' '}
        {FORMATO_PLAZO.format(new Date(confirmaSoloEl))}.
      </p>
    );
  }
  if (estadoResultado === 'confirmed') {
    return <p className={styles.texto}>Resultado confirmado.</p>;
  }
  return null;
}
