import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerGestionCacheada } from '../_datos';
import { PanelInscripciones } from '../PanelInscripciones';
import { PanelAgregarEquipo } from '../PanelAgregarEquipo';

export const metadata: Metadata = { title: conNombreProducto('Equipos del torneo') };

/** UC-25 / UC-26 — Solicitudes pendientes, equipos confirmados, y carga a mano. */
export default async function PaginaEquipos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  return (
    <>
      <PanelInscripciones
        torneoId={id}
        inscripciones={gestion.inscripciones}
        cupoEquipos={gestion.cupoEquipos}
        divisionesDelCertamen={gestion.divisionesDelCertamen}
      />
      {/* UC-26 — El primer organizador llega con equipos que no tienen
          cuenta, y sin esto armar un torneo exigía que ocho capitanes se
          registraran primero. */}
      <PanelAgregarEquipo torneoId={id} habilitado={gestion.estado === 'registration_open'} />
    </>
  );
}
