import type { ReactNode } from 'react';
import { exigirQueOrganice } from '../_datos';

/**
 * Configuración entera es de la organización: definir el formato, las
 * reglas, el reglamento, las divisiones, el estado del torneo, los
 * colaboradores y los administradores. Un Colaborador asignado entra a
 * la gestión —Resultados y la parte de programar de Fixture— pero esto
 * no es suyo (`06`, D-32: sus permisos son fijos y cubren la operación
 * de la fecha, no las condiciones bajo las que se compite).
 *
 * El guard va en este layout y no en cada una de las ocho secciones por
 * una razón concreta: una sección nueva nace protegida. Con el chequeo
 * repetido ocho veces, la novena se olvida y nadie se entera — abajo
 * cada servicio igual dice que no, pero recién al tocar el botón.
 */
export default async function LayoutConfiguracion({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await exigirQueOrganice(id);
  return <>{children}</>;
}
