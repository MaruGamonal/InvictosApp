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
}: CabeceraDeModoProps) {
  return (
    <header className={styles.cabecera}>
      <MarcaInvicta conEnlaceIngresar={false} />

      <div className={styles.filaUsuario}>
        <Escudo src={fotoUrl ?? null} nombre={nombreUsuario} tamano={44} />
        <div className={styles.textoUsuario}>
          <span className={styles.saludo}>Hola, {nombreUsuario}</span>
          <span className={`fuente-display ${styles.titulo}`}>{titulo}</span>
        </div>
      </div>

      {puedeCambiarDeModo && <CambiarDeModo modoActual={modo} />}
    </header>
  );
}
