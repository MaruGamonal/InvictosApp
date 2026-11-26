import type { ReactNode } from 'react';
import { EnlaceVolver } from './EnlaceVolver';
import styles from './CabeceraDeTarea.module.css';

/**
 * La cabecera de una pantalla de tarea: un formulario o una acción
 * puntual (crear, editar, invitar, dar de baja, la lista de buena fe).
 *
 * Siempre igual, en el mismo lugar:
 *   ← Volver
 *   CONTEXTO (sobre qué equipo o torneo, en una línea)
 *   TÍTULO   (el verbo de la tarea, corto)
 *   Descripción opcional, una o dos líneas.
 *
 * El nombre del equipo o del torneo va en el contexto y no en el
 * título: los nombres largos hacían un `<h1>` de tres renglones que
 * empujaba el formulario fuera de la pantalla.
 */
export function CabeceraDeTarea({
  volverA,
  contexto,
  titulo,
  descripcion,
  accion,
}: {
  volverA: string;
  contexto?: string;
  titulo: string;
  descripcion?: ReactNode;
  /** Un enlace secundario a la derecha del título ("Ver cómo te ven"). */
  accion?: ReactNode;
}) {
  return (
    <header className={styles.cabecera}>
      <EnlaceVolver alternativa={volverA} />
      {contexto && <p className={styles.contexto}>{contexto}</p>}
      <div className={styles.filaTitulo}>
        <h1 className={`fuente-display ${styles.titulo}`}>{titulo}</h1>
        {accion}
      </div>
      {descripcion && <p className={styles.descripcion}>{descripcion}</p>}
    </header>
  );
}
