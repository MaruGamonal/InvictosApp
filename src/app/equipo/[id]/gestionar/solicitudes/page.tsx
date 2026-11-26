import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerMiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { obtenerGestionEquipo } from '@/services/equipos/obtenerGestionEquipo';
import { obtenerRolesEnEquipo } from '@/lib/permisos';
import { EstadoVacio } from '@/components/EstadoVacio';
import { conNombreProducto } from '@/lib/nombreProducto';
import { PanelSolicitudesIngreso } from './PanelSolicitudesIngreso';
import styles from './pagina.module.css';
import { CabeceraDeTarea } from '@/components/CabeceraDeTarea';

export const metadata: Metadata = { title: conNombreProducto('Solicitudes de ingreso') };

/**
 * UC-53 — Pantalla propia para las solicitudes de ingreso: antes vivían
 * mezcladas con las invitaciones dentro de "Gestionar equipo", pero son
 * el flujo inverso (alguien de afuera pide entrar, no el equipo
 * proponiendo hacia adentro) y necesitan su propia explicación — de ahí
 * que tengan pantalla aparte, con el enlace desde la gestión.
 */
export default async function PaginaSolicitudesIngreso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const perfil = await obtenerMiPerfil(undefined, contexto);
  const roles = await obtenerRolesEnEquipo(perfil.id, id);
  if (!roles.includes('captain') && !roles.includes('delegate')) redirect(`/equipo/${id}`);

  const gestion = await obtenerGestionEquipo({ equipoId: id }, contexto);

  return (
    <main className={styles.pagina}>
      <CabeceraDeTarea volverA={`/equipo/${id}/gestionar`} titulo="Solicitudes de ingreso" />

      {gestion.solicitudesPendientes.length === 0 ? (
        <EstadoVacio mensaje="No hay solicitudes de ingreso pendientes." />
      ) : (
        <PanelSolicitudesIngreso equipoId={id} solicitudes={gestion.solicitudesPendientes} />
      )}
    </main>
  );
}
