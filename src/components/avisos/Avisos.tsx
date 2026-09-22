'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './Avisos.module.css';

/**
 * Feedback de una acción, en un solo lugar para toda la aplicación.
 *
 * Reemplaza el patrón que había: un `<p>Guardado.</p>` permanente dentro
 * del formulario. Tenía tres problemas. Se quedaba para siempre, así que
 * después de guardar dos veces no se distinguía la confirmación vieja de
 * la nueva. Ocupaba lugar fijo y empujaba el contenido al aparecer. Y en
 * un formulario largo quedaba fuera de la pantalla justo cuando se
 * tocaba el botón, que es el único momento en que hacía falta.
 *
 * Un aviso, en cambio, se muestra sobre el contenido —sin desplazarlo—,
 * se va solo, y sale siempre del mismo lado de la pantalla.
 *
 * **Accesibilidad.** Cada tono lleva su propio ícono y su propio texto:
 * el color nunca es lo único que distingue un éxito de un error (`08`,
 * 11.10). La región es `aria-live`, `polite` para lo que salió bien y
 * `assertive` para lo que falló, así que un lector de pantalla lo
 * anuncia sin que haga falta moverse hasta él. El aviso de error no se
 * va solo: un error que desaparece antes de leerse es peor que no
 * avisarlo, así que se cierra a mano, con un botón de 44px.
 */

export type TonoAviso = 'cargando' | 'exito' | 'error' | 'advertencia';

export interface AccionDeAviso {
  etiqueta: string;
  alTocar: () => void;
}

export interface Aviso {
  id: number;
  tono: TonoAviso;
  mensaje: string;
  /** Botón secundario, para cuando avisar no alcanza y hay algo que hacer. */
  accion?: AccionDeAviso;
}

/** Suficiente para leer «Equipo actualizado» sin quedarse en pantalla. */
const MILISEGUNDOS_VISIBLE = 4000;

export interface Avisador {
  /**
   * Muestra «Guardando…» y devuelve su id, para pasárselo después a
   * `exito` o a `error` y que el mismo aviso cambie de estado en vez de
   * apilar dos.
   */
  cargando: (mensaje: string) => number;
  exito: (mensaje: string, reemplazaA?: number) => void;
  error: (mensaje: string, reemplazaA?: number) => void;
  /**
   * El bloqueo por cuenta sin confirmar, igual en toda la aplicación.
   *
   * Antes cada pantalla insertaba un bloque dentro del contenido: el
   * botón «Pedir sumarme» directamente se reemplazaba por el aviso, y
   * los formularios de alta lo metían entre los campos. En los dos
   * casos la pantalla cambiaba de alto y lo de abajo se movía de lugar.
   *
   * Es una sola función y no un aviso armado en cada pantalla para que
   * el texto, el tono y el botón de reenviar sean siempre los mismos.
   */
  cuentaNoConfirmada: (mensaje?: string) => void;
  cerrar: (id: number) => void;
}

const ContextoAvisos = createContext<Avisador | null>(null);

/**
 * Fuera del proveedor no rompe: descarta el aviso en silencio. Así un
 * componente con avisos se puede renderizar en un test o en una pantalla
 * aislada sin montar toda la aplicación alrededor.
 */
const AVISADOR_MUDO: Avisador = {
  cargando: () => 0,
  exito: () => {},
  error: () => {},
  cuentaNoConfirmada: () => {},
  cerrar: () => {},
};

export function useAvisos(): Avisador {
  return useContext(ContextoAvisos) ?? AVISADOR_MUDO;
}

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguienteId = useRef(1);
  const temporizadores = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const cerrar = useCallback((id: number) => {
    const temporizador = temporizadores.current.get(id);
    if (temporizador) {
      clearTimeout(temporizador);
      temporizadores.current.delete(id);
    }
    setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
  }, []);

  /** Al desmontar, ningún `setState` pendiente sobre un árbol que ya no está. */
  useEffect(() => {
    const pendientes = temporizadores.current;
    return () => {
      pendientes.forEach(clearTimeout);
      pendientes.clear();
    };
  }, []);

  const avisador = useMemo<Avisador>(() => {
    function mostrar(
      tono: TonoAviso,
      mensaje: string,
      reemplazaA?: number,
      accion?: AccionDeAviso,
    ): number {
      const id = siguienteId.current++;

      if (reemplazaA !== undefined) {
        const temporizador = temporizadores.current.get(reemplazaA);
        if (temporizador) {
          clearTimeout(temporizador);
          temporizadores.current.delete(reemplazaA);
        }
      }

      setAvisos((actuales) => {
        const nuevo: Aviso = { id, tono, mensaje, accion };
        if (reemplazaA === undefined) return [...actuales, nuevo];
        // En el lugar del que reemplaza: el aviso no salta de posición
        // al pasar de «Guardando…» a «Equipo actualizado».
        const indice = actuales.findIndex((aviso) => aviso.id === reemplazaA);
        if (indice === -1) return [...actuales, nuevo];
        const siguiente = [...actuales];
        siguiente[indice] = nuevo;
        return siguiente;
      });

      // «Guardando…» dura lo que dure la operación; el error y la
      // advertencia, hasta que los cierren. Solo el éxito se va solo.
      if (tono === 'exito') {
        temporizadores.current.set(
          id,
          setTimeout(() => {
            temporizadores.current.delete(id);
            setAvisos((actuales) => actuales.filter((aviso) => aviso.id !== id));
          }, MILISEGUNDOS_VISIBLE),
        );
      }

      return id;
    }

    return {
      cargando: (mensaje) => mostrar('cargando', mensaje),
      exito: (mensaje, reemplazaA) => {
        mostrar('exito', mensaje, reemplazaA);
      },
      error: (mensaje, reemplazaA) => {
        mostrar('error', mensaje, reemplazaA);
      },
      cuentaNoConfirmada: (mensaje) => {
        const texto = mensaje ?? MENSAJE_CUENTA_NO_CONFIRMADA;

        function pedirReenvio(idActual: number) {
          const enCurso = mostrar('cargando', 'Reenviando el enlace…', idActual);
          void fetch('/api/reenviar-confirmacion', { method: 'POST' })
            .then((respuesta) => {
              if (respuesta.ok) {
                mostrar('exito', 'Te reenviamos el enlace — revisá tu correo.', enCurso);
                return;
              }
              mostrar('error', 'No pudimos reenviarlo. Probá de nuevo.', enCurso, {
                etiqueta: 'Reenviar email',
                alTocar: () => pedirReenvio(enCurso),
              });
            })
            .catch(() => {
              mostrar('error', 'No pudimos conectar. Probá de nuevo.', enCurso, {
                etiqueta: 'Reenviar email',
                alTocar: () => pedirReenvio(enCurso),
              });
            });
        }

        const id = mostrar('advertencia', texto, undefined, {
          etiqueta: 'Reenviar email',
          // El id que reemplaza es el del aviso que se está mostrando,
          // así el «Reenviando…» ocupa su lugar en vez de apilarse.
          alTocar: () => pedirReenvio(id),
        });
      },
      cerrar,
    };
  }, [cerrar]);

  return (
    <ContextoAvisos.Provider value={avisador}>
      {children}
      <ListaDeAvisos avisos={avisos} cerrar={cerrar} />
    </ContextoAvisos.Provider>
  );
}

/** Texto único del bloqueo: qué pasa y qué hacer para seguir. */
const MENSAJE_CUENTA_NO_CONFIRMADA = 'Confirmá tu cuenta para continuar — revisá tu correo.';

const CLASE_POR_TONO: Record<TonoAviso, string> = {
  cargando: styles.cargando!,
  exito: styles.exito!,
  error: styles.error!,
  advertencia: styles.advertencia!,
};

function ListaDeAvisos({ avisos, cerrar }: { avisos: Aviso[]; cerrar: (id: number) => void }) {
  const hayError = avisos.some((aviso) => aviso.tono === 'error');
  /** Un aviso que trae algo para hacer no se puede ir solo. */
  const persistente = (tono: TonoAviso) => tono === 'error' || tono === 'advertencia';

  return (
    <div
      className={styles.contenedor}
      // Sin `aria-live` en el contenedor —que está siempre montado— un
      // lector de pantalla no anuncia nada: las regiones en vivo avisan
      // de los cambios *dentro* de un nodo que ya existía.
      aria-live={hayError ? 'assertive' : 'polite'}
      aria-atomic="false"
    >
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          className={`${styles.aviso} ${CLASE_POR_TONO[aviso.tono]}`}
          role={aviso.tono === 'error' ? 'alert' : 'status'}
        >
          <IconoDeTono tono={aviso.tono} />
          <p className={styles.mensaje}>{aviso.mensaje}</p>
          {aviso.accion && (
            <button type="button" className={styles.accion} onClick={aviso.accion.alTocar}>
              {aviso.accion.etiqueta}
            </button>
          )}
          {persistente(aviso.tono) && (
            <button
              type="button"
              className={styles.cerrar}
              onClick={() => cerrar(aviso.id)}
              aria-label="Cerrar aviso"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden focusable="false">
                <path
                  d="M3.5 3.5l9 9m0-9l-9 9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * La forma, no solo el color. El tilde, el triángulo, el círculo con la
 * "i" y el disco girando se distinguen en escala de grises y con
 * cualquier daltonismo.
 */
function IconoDeTono({ tono }: { tono: TonoAviso }) {
  if (tono === 'advertencia') {
    return (
      <svg className={styles.icono} viewBox="0 0 16 16" aria-hidden focusable="false">
        <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 4.6v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="8" cy="11.4" r="0.9" fill="currentColor" />
      </svg>
    );
  }

  if (tono === 'cargando') {
    return (
      <svg className={styles.icono} viewBox="0 0 16 16" aria-hidden focusable="false">
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.3"
        />
        <path
          className={styles.giro}
          d="M8 2a6 6 0 0 1 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (tono === 'exito') {
    return (
      <svg className={styles.icono} viewBox="0 0 16 16" aria-hidden focusable="false">
        <path
          d="M3 8.5l3.5 3.5L13 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className={styles.icono} viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M8 1.8L15 14H1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 6v3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="11.8" r="0.9" fill="currentColor" />
    </svg>
  );
}
