'use client';

import { useState, type ReactNode } from 'react';
import { BotonSeguir } from './BotonSeguir';
import { formatearCantidadSeguidores } from '@/lib/seguidores';

export interface BloqueSeguimientoProps {
  tipoSeguido: 'tournament' | 'team';
  entidadId: string;
  cantidadSeguidoresInicial: number;
  claseCantidad: string | undefined;
  claseAcciones: string | undefined;
  /** Contenido entre el contador y la fila de acciones — típicamente los badges/meta del nombre. */
  children?: ReactNode;
  /** Otros botones de la fila de acciones (Pedir sumarme, Inscribir a mi equipo, Compartir…), ya instanciados por quien llama. */
  accionesExtra?: ReactNode;
}

/**
 * "Cuántos seguidores" va debajo del nombre (reportado en vivo), pero el
 * botón "Seguir" comparte fila con el resto de las acciones más abajo —
 * dos lugares distintos del mismo dato. Mantenerlos sincronizados exige
 * un estado compartido; `BotonSeguir` sigue siendo la única fuente de
 * verdad del conteo optimista, esto solo lo refleja aparte.
 */
export function BloqueSeguimiento({
  tipoSeguido,
  entidadId,
  cantidadSeguidoresInicial,
  claseCantidad,
  claseAcciones,
  children,
  accionesExtra,
}: BloqueSeguimientoProps) {
  const [cantidad, setCantidad] = useState(cantidadSeguidoresInicial);

  return (
    <>
      <p className={claseCantidad}>{formatearCantidadSeguidores(cantidad)}</p>
      {children}
      <div className={claseAcciones}>
        <BotonSeguir
          tipoSeguido={tipoSeguido}
          entidadId={entidadId}
          cantidadSeguidoresInicial={cantidadSeguidoresInicial}
          mostrarCantidad={false}
          onCambioCantidad={setCantidad}
        />
        {accionesExtra}
      </div>
    </>
  );
}
