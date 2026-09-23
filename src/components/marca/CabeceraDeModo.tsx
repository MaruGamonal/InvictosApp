import type { ReactNode } from 'react';
import { Escudo } from '@/components/Escudo';
import { CambiarDeModo } from './CambiarDeModo';
import { MarcaInvicta } from './MarcaInvicta';
import styles from './CabeceraDeModo.module.css';

export interface CabeceraDeModoProps {
  modo: 'jugador' | 'organizador';
  /** Nombre de quien mira, para el saludo. */
  nombreUsuario: string;
  /**
   * Lo que la pantalla representa: el equipo en modo jugador, la
   * organización en modo organizador. Es la única diferencia real
   * entre las dos cabeceras.
   */
  titulo: string;
  fotoUrl?: string | null;
  /** Solo se ofrece el cambio a quien tiene los dos roles. */
  puedeCambiarDeModo?: boolean;
  /**
   * Debajo del título, en la misma cabecera: en modo organizador, cuál
   * de las organizaciones se está gestionando.
   *
   * El título dice el **modo** ("Organizador") y esto dice la
   * **entidad**. Antes el título era el nombre de la organización, y no
   * se distinguía de un rótulo cualquiera: no quedaba claro que fuera
   * la organización activa ni que hubiera otra a la que cambiar.
   */
  bajoElTitulo?: ReactNode;
}

/**
 * La cabecera de Inicio, la misma en los dos modos.
 *
 * Eran dos cabeceras distintas: la de Jugador con avatar, saludo y el
 * nombre del equipo; la de Organizador con una etiqueta "Modo
 * Organizador" y el nombre de la organización, con otro ritmo vertical.
 * Cambiar de modo se sentía como cambiar de aplicación.
 *
 * Ahora es un solo componente y **lo único que cambia es el título**:
 * el equipo en modo jugador, la organización en modo organizador. El
 * saludo, el avatar, la marca, la campanita y el cambio de modo son los
 * mismos objetos en el mismo lugar.
 */
export function CabeceraDeModo({
  modo,
  nombreUsuario,
  titulo,
  fotoUrl,
  puedeCambiarDeModo = false,
  bajoElTitulo,
}: CabeceraDeModoProps) {
  return (
    <header className={styles.cabecera}>
      <MarcaInvicta conEnlaceIngresar={false} modo={modo} />

      <div className={styles.filaUsuario}>
        <Escudo src={fotoUrl ?? null} nombre={nombreUsuario} tamano={44} />
        <div className={styles.textoUsuario}>
          <span className={styles.saludo}>Hola, {nombreUsuario}</span>
          <span className={`fuente-display ${styles.titulo}`}>{titulo}</span>
        </div>
      </div>

      {bajoElTitulo}

      {puedeCambiarDeModo && <CambiarDeModo modoActual={modo} />}
    </header>
  );
}
