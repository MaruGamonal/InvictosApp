'use client';

import { useState } from 'react';
import { elegirCategoriaGenero } from './_acciones';
import styles from './SelectorDeCategoriaGenero.module.css';

export interface SelectorDeCategoriaGeneroProps {
  categoriaActual?: string;
}

const OPCIONES = [
  {
    valor: '',
    titulo: 'Todas las categorías',
    detalle: 'Torneos masculinos, femeninos y mixtos.',
    inicial: 'T',
  },
  {
    valor: 'male',
    titulo: 'Torneos masculinos',
    detalle: 'Fixture, tabla y equipos de la categoría masculina — más los mixtos.',
    inicial: 'M',
  },
  {
    valor: 'female',
    titulo: 'Torneos femeninos',
    detalle: 'Fixture, tabla y equipos de la categoría femenina — más los mixtos.',
    inicial: 'F',
  },
];

/**
 * UC-22 — Preferencia de categoría (`06`, D-90, mismo criterio que la
 * ciudad): un chip en la cabecera abre una hoja inferior con las tres
 * opciones; elegir una dispara `elegirCategoriaGenero`, que guarda la
 * cookie y vuelve a `/torneos`. Sin JavaScript, el chip simplemente no
 * abre nada — no bloquea nada más (D-04b).
 */
export function SelectorDeCategoriaGenero({ categoriaActual }: SelectorDeCategoriaGeneroProps) {
  const [abierto, setAbierto] = useState(false);
  const actual = OPCIONES.find((op) => op.valor === (categoriaActual ?? '')) ?? OPCIONES[0]!;

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className={styles.chip}>
        <span className={styles.inicial}>{actual.inicial}</span>
        <span>{actual.titulo === 'Todas las categorías' ? 'Todas' : actual.titulo}</span>
      </button>

      {abierto && (
        <div className={styles.fondo} onClick={() => setAbierto(false)}>
          <div className={styles.hoja} onClick={(e) => e.stopPropagation()}>
            <div className={styles.agarradera} />
            <div>
              <h2 className={`fuente-display ${styles.titulo}`}>Elegí qué torneos ver</h2>
              <p className={styles.subtitulo}>
                Podés cambiarlo cuando quieras. No hace falta cuenta.
              </p>
            </div>

            <form className={styles.opciones}>
              {OPCIONES.map((opcion) => (
                <button
                  key={opcion.valor}
                  type="submit"
                  formAction={elegirCategoriaGenero.bind(null, opcion.valor)}
                  className={`${styles.opcion} ${opcion.valor === actual.valor ? styles.opcionActiva : ''}`}
                >
                  <div>
                    <div className={styles.opcionTitulo}>{opcion.titulo}</div>
                    <div className={styles.opcionDetalle}>{opcion.detalle}</div>
                  </div>
                  <span className={styles.radio} aria-hidden />
                </button>
              ))}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
