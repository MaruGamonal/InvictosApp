'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './HojaDeOpciones.module.css';

export interface HojaDeOpcionesProps {
  /** El texto del control cerrado: dice **dónde estás**, no a dónde vas. */
  etiqueta: string;
  /**
   * Cómo se ve cerrado. `'barra'` es el control de 44px a todo el
   * ancho; `'chip'` es la píldora chica que va en la fila de la marca,
   * al lado de la campana — se lee como un rótulo, no como un botón,
   * aunque se toque.
   */
  aspecto?: 'barra' | 'chip';
  /** Qué hay a la izquierda de la etiqueta en el control cerrado. */
  icono?: ReactNode;
  /** Para lectores de pantalla, porque la etiqueta sola es un estado. */
  descripcionDelControl: string;
  titulo: string;
  bajada?: string;
  /** Las opciones, armadas por la pantalla con `_opcionesDeHoja`. */
  children: ReactNode;
}

/**
 * Una hoja que sube desde abajo con las opciones de algo, cada una con
 * su nombre, lo que hay de ese lado y la marca de cuál está puesta.
 *
 * **Por qué una hoja y no un enlace.** El cambio de modo era un enlace
 * que decía "Ir al modo organizador": nombraba el modo al que vas, así
 * que el único cartel del modo en el que estás era el de salida. Y
 * como las dos bottom nav dicen lo mismo —Inicio · Equipo · Torneos ·
 * Perfil— no había dónde más mirar. Acá las dos opciones están a la
 * vista, con la actual marcada.
 *
 * **Por qué `<details>` y no `<dialog>`.** Un `<details>` abre sin
 * JavaScript. Este es el control que saca a la persona de donde está;
 * no puede quedar muerto hasta que hidrate. Cerrar tocando afuera y
 * con Escape se agrega acá arriba como mejora, no como requisito: sin
 * JavaScript se cierra tocando de nuevo el disparador, que queda
 * encendido arriba del velo justamente para eso.
 *
 * La opción que ya está puesta se marca y **no se toca** (`aria-current`
 * y `claseDeOpcion`): elegir dónde ya estás no lleva a ningún lado, y
 * un enlace a la ruta actual encima dejaría la hoja abierta.
 */
export function HojaDeOpciones({
  etiqueta,
  aspecto = 'barra',
  icono,
  descripcionDelControl,
  titulo,
  bajada,
  children,
}: HojaDeOpcionesProps) {
  const hoja = useRef<HTMLDetailsElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLElement>(null);

  useEffect(() => {
    const elemento = hoja.current;
    if (!elemento) return;

    function cerrar() {
      if (elemento!.open) elemento!.open = false;
    }

    function alTocar(evento: MouseEvent) {
      if (!elemento!.open) return;
      const destino = evento.target as Node | null;
      if (!destino) return;
      // El disparador se cierra solo (es el `summary`); el panel no se
      // cierra al tocarlo adentro.
      if (disparador.current?.contains(destino)) return;
      if (panel.current?.contains(destino)) return;
      cerrar();
    }

    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === 'Escape') cerrar();
    }

    document.addEventListener('click', alTocar);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('click', alTocar);
      document.removeEventListener('keydown', alTeclear);
    };
  }, []);

  return (
    <details ref={hoja} className={styles.hoja}>
      <summary
        ref={disparador as React.RefObject<HTMLElement>}
        className={aspecto === 'chip' ? styles.chip : styles.disparador}
        aria-label={`${descripcionDelControl}: ${etiqueta}`}
      >
        {icono}
        <span className={styles.etiqueta}>{etiqueta}</span>
        <svg
          className={styles.chevron}
          viewBox="0 0 16 16"
          width={aspecto === 'chip' ? 10 : 12}
          height={aspecto === 'chip' ? 10 : 12}
          aria-hidden
          focusable="false"
        >
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <div className={styles.velo} />

      <div ref={panel} className={styles.panel} role="group" aria-label={titulo}>
        <span className={styles.manija} aria-hidden />
        <h2 className={`fuente-display ${styles.titulo}`}>{titulo}</h2>
        {bajada && <p className={styles.bajada}>{bajada}</p>}
        <div className={styles.opciones}>{children}</div>
      </div>
    </details>
  );
}
