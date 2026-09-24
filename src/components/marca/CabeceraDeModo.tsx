import type { ReactNode } from 'react';
import { Escudo } from '@/components/Escudo';
import { CambiarDeModo } from './CambiarDeModo';
import { MarcaInvicta } from './MarcaInvicta';
import styles from './CabeceraDeModo.module.css';

export interface CabeceraDeModoProps {
  modo: 'jugador' | 'organizador';
  /**
   * Quien mira. Es lo que va en grande: la cabecera saluda a una
   * persona, no rotula una pantalla.
   */
  nombreUsuario: string;
  fotoUrl?: string | null;
  /** Solo se ofrece el cambio a quien tiene los dos roles. */
  puedeCambiarDeModo?: boolean;
  /**
   * Al lado del nombre, en la misma línea: en modo organizador, cuál de
   * las organizaciones se está gestionando.
   *
   * Va al lado y no debajo para no sumar un tercer renglón a la
   * cabecera — el saludo, el nombre y la organización uno arriba del
   * otro empujaban todo el contenido hacia abajo.
   */
  alCostadoDelNombre?: ReactNode;
}

/**
 * La cabecera de Inicio, la misma en los dos modos.
 *
 * Eran dos cabeceras distintas: la de Jugador con avatar, saludo y el
 * nombre del equipo; la de Organizador con una etiqueta "Modo
 * Organizador" y el nombre de la organización, con otro ritmo vertical.
 * Cambiar de modo se sentía como cambiar de aplicación.
 *
 * Ahora es un solo componente y, en los dos modos, dice lo mismo:
 * **a quién está saludando**. "Hola," chico arriba y el nombre de la
 * persona en grande debajo.
 *
 * Antes en ese lugar iba el equipo o la palabra "Organizador". Ninguna
 * de las dos cosas hacía falta ahí: el equipo tiene su pantalla y su
 * nav, y el modo ya lo dice el botón de cambiarlo, que está a la vista
 * y a todo el ancho. Un rótulo grande que repite dónde estoy ocupa el
 * lugar de lo único que esa fila tiene para decir.
 *
 * En modo organizador, la organización activa va al lado del nombre
 * (`alCostadoDelNombre`): esa sí es información que cambia y que hay
 * que poder cambiar.
 */
export function CabeceraDeModo({
  modo,
  nombreUsuario,
  fotoUrl,
  puedeCambiarDeModo = false,
  alCostadoDelNombre,
}: CabeceraDeModoProps) {
  return (
    <header className={styles.cabecera}>
      <MarcaInvicta conEnlaceIngresar={false} modo={modo} />

      <div className={styles.filaUsuario}>
        <Escudo src={fotoUrl ?? null} nombre={nombreUsuario} tamano={44} />
        <div className={styles.textoUsuario}>
          <span className={styles.saludo}>Hola,</span>
          <div className={styles.filaTitulo}>
            <span className={`fuente-display ${styles.titulo}`}>{nombreUsuario}</span>
            {alCostadoDelNombre}
          </div>
        </div>
      </div>

      {puedeCambiarDeModo && <CambiarDeModo modoActual={modo} />}
    </header>
  );
}
