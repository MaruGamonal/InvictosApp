'use client';

import { useRouter } from 'next/navigation';
import { useAvisos } from '@/components/avisos/Avisos';
import styles from './BotonCrearTorneo.module.css';

export interface BotonCrearTorneoProps {
  /**
   * Sin verificar, la organización puede tener un torneo publicado a la
   * vez (`06`, D-51). Cuando ya lo tiene, crear otro no lleva a ningún
   * lado: terminaría en el rechazo de `publicarTorneo`.
   */
  bloqueado: boolean;
}

/**
 * "Crear torneo" del panel de Organizador.
 *
 * El botón **no desaparece** cuando está bloqueado: un botón que se
 * esconde no explica nada, y la pregunta que la persona se hace —"¿por
 * qué no puedo crear un torneo?"— se queda sin respuesta. Se queda a la
 * vista, dice que está bloqueado (`aria-disabled`, no `disabled`, para
 * que siga siendo enfocable y anunciable) y al tocarlo responde con el
 * motivo y el camino para levantarlo.
 *
 * Esto es lo que se muestra, no lo que decide: `publicarTorneo`
 * comprueba el límite por su cuenta, así que entrar a `/torneo/crear`
 * escribiendo la URL no saltea nada.
 */
export function BotonCrearTorneo({ bloqueado }: BotonCrearTorneoProps) {
  const router = useRouter();
  const avisos = useAvisos();

  function alTocar() {
    if (!bloqueado) {
      router.push('/torneo/crear');
      return;
    }
    avisos.advertencia('Verificá tu organización para crear otros torneos.', {
      etiqueta: 'Ver organización',
      alTocar: () => router.push('/organizador/gestionar/perfil'),
    });
  }

  return (
    <button
      type="button"
      className={bloqueado ? styles.botonBloqueado : styles.boton}
      onClick={alTocar}
      aria-disabled={bloqueado || undefined}
    >
      + Crear torneo
    </button>
  );
}
