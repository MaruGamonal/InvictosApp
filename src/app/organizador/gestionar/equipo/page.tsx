import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { conNombreProducto } from '@/lib/nombreProducto';
import { listarMiembros } from '@/services/organizadores/listarMiembros';
import { obtenerContextoCacheado, obtenerOrganizacionActivaCacheada } from '../_datos';
import { ListaEquipoDeTrabajo } from './ListaEquipoDeTrabajo';

export const metadata: Metadata = { title: conNombreProducto('Equipo de trabajo') };

/** UC-07 — Equipo de trabajo de la organización: quién administra, además de vos. */
export default async function PaginaEquipoDeTrabajo() {
  const organizacion = await obtenerOrganizacionActivaCacheada();
  if (!organizacion) redirect('/organizador/gestionar');

  const contexto = await obtenerContextoCacheado();
  const miembros = await listarMiembros({ organizacionId: organizacion.organizacionId }, contexto);

  return (
    <ListaEquipoDeTrabajo
      organizacionId={organizacion.organizacionId}
      miembros={miembros}
      esTitular={organizacion.rol === 'owner'}
    />
  );
}
