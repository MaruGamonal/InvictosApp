import type { ReactNode } from 'react';
import { Escudo } from '@/components/Escudo';
import { SelectorDeModo } from './SelectorDeModo';
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
   * Al lado del nombre, en la misma línea: en modo organizador con una
   * sola organización, cuál es.
   *
   * Va al lado y no debajo para no sumar un tercer renglón a la
   * cabecera — el saludo, el nombre y la organización uno arriba del
   * otro empujaban todo el contenido hacia abajo.
   */
  alCostadoDelNombre?: ReactNode;
  /**
   * La fila de 44px de abajo de la cabecera: en modo organizador con
   * más de una organización, cuál se está gestionando.
   *
   * Esa fila es **solo** de la organización. El modo se fue de ahí al
   * chip de arriba: cambiar de modo es poco frecuente y un control a
   * todo el ancho le daba el peso de una acción principal, además de
   * dejar la cabecera del panel en ~190px antes de que empiece el
   * contenido. Cambiar de organización sí se hace seguido.
   */
  controlDeOrganizacion?: ReactNode;
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
  controlDeOrganizacion,
}: CabeceraDeModoProps) {
  return (
    <header className={styles.cabecera}>
      {/* El chip del modo va en `acciones`, que es el hueco de antes de
          la campana: "Jugador" o "Organizador", al lado de la
          campanita. Solo lo ve quien tiene los dos roles. */}
      <MarcaInvicta
        conEnlaceIngresar={false}
        modo={modo}
        acciones={puedeCambiarDeModo ? <SelectorDeModo modoActual={modo} /> : null}
      />

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

      {controlDeOrganizacion && (
        <div className={styles.filaDeOrganizacion}>{controlDeOrganizacion}</div>
      )}
    </header>
  );
}
