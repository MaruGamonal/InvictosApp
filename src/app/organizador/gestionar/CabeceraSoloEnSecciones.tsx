'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Las pantallas de tarea del panel —crear una organización, invitar un
 * administrador— no llevan la banda de saludo: son un formulario con
 * su propia cabecera de tarea ("← Volver" y el título), igual que en el
 * resto de la app. La banda gastaba unos 170 px arriba del formulario y
 * no ofrecía volver.
 *
 * Las secciones del nav inferior (Inicio, Equipo, Torneos, Perfil) la
 * siguen mostrando.
 */
const TAREAS = ['/organizador/gestionar/crear', '/organizador/gestionar/invitar'];

export function CabeceraSoloEnSecciones({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  return TAREAS.some((tarea) => ruta?.startsWith(tarea)) ? null : children;
}
