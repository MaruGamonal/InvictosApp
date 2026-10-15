import type { ReactNode } from 'react';
import styles from './HojaDeOpciones.module.css';

/**
 * Las piezas de una opción de `HojaDeOpciones`, en un módulo aparte y
 * **sin `'use client'`**.
 *
 * Están separadas a propósito: `HojaDeOpciones` es un componente
 * cliente, y en un módulo cliente cada export se reemplaza por una
 * referencia — un `const` o una función suelta que un componente de
 * servidor importe de ahí le llega como un proxy sin nada adentro.
 * Eso ya rompió producción una vez con un `Set`
 * (`_clienteSinValoresExportados.arquitectura.test.ts`). `claseDeOpcion`
 * la llaman las pantallas, que son de servidor, así que vive acá.
 *
 * Cada pantalla arma su propia opción —`<Link>` cuando es navegar,
 * `<button formAction>` cuando es una Server Action— y le pone estas
 * clases y este cuerpo. La hoja no sabe de ninguna de las dos cosas.
 */

export function claseDeOpcion(elegida: boolean): string {
  return elegida ? styles.opcionElegida! : styles.opcion!;
}

export interface CuerpoDeOpcionProps {
  titulo: string;
  /** Qué hay de ese lado. Sin esto la hoja es dos nombres sin diferencia. */
  detalle?: ReactNode;
  elegida: boolean;
}

export function CuerpoDeOpcion({ titulo, detalle, elegida }: CuerpoDeOpcionProps) {
  return (
    <>
      <span className={styles.textoOpcion}>
        <span className={`fuente-display ${styles.tituloOpcion}`}>{titulo}</span>
        {detalle && <span className={styles.detalleOpcion}>{detalle}</span>}
      </span>
      <span className={elegida ? styles.radioElegido : styles.radio} aria-hidden />
    </>
  );
}
