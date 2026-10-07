'use client';

import { useDejarEquipo } from './useDejarEquipo';
import styles from './pagina.module.css';

export interface PanelDejarEquipoProps {
  equipoId: string;
  perfilId: string;
}

/**
 * Lo único que un integrante sin capitanía ni delegación puede hacer
 * sobre su equipo: irse.
 *
 * Reportado en vivo: a un jugador se le ofrecía "Gestionar equipo" y lo
 * que encontraba del otro lado era una pantalla titulada "Gestionar
 * <equipo>" con el plantel entero —el mismo que acababa de ver en la
 * ficha— y una × chiquita al lado de su propio nombre. La × era, de
 * hecho, "dejar el equipo", pero nada lo decía: la pantalla prometía
 * una gestión que esa persona no tiene y escondía la única acción que
 * sí tiene detrás de un símbolo.
 */
export function PanelDejarEquipo({ equipoId, perfilId }: PanelDejarEquipoProps) {
  const { dejarEquipo, enviando } = useDejarEquipo(equipoId, perfilId);

  return (
    <button
      type="button"
      className={styles.botonDejarEquipo}
      onClick={dejarEquipo}
      disabled={enviando}
    >
      {enviando ? 'Saliendo…' : 'Dejar equipo'}
    </button>
  );
}
