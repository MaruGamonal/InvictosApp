import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerGestionCacheada } from '../_datos';
import { PanelInscripciones } from '../PanelInscripciones';

export const metadata: Metadata = { title: conNombreProducto('Equipos del torneo') };

/** UC-25 — Solicitudes pendientes y equipos ya confirmados. */
export default async function PaginaEquipos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  return (
    <PanelInscripciones
      torneoId={id}
      inscripciones={gestion.inscripciones}
      cupoEquipos={gestion.cupoEquipos}
    />
  );
}
