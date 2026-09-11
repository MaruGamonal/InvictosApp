import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerMiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { obtenerRolesEnEquipo } from '@/lib/permisos';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioInvitarIntegrante } from './FormularioInvitarIntegrante';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Invitar integrante') };

/** UC-11 — Pantalla propia para invitar, separada de "Gestionar equipo" (mismo criterio que Solicitudes). */
export default async function PaginaInvitarIntegrante({
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

  return (
    <div className={styles.pagina}>
      <Link href={`/equipo/${id}/gestionar`} className={styles.enlaceVolver}>
        ← Volver
      </Link>
      <h1 className={`fuente-display ${styles.titulo}`}>Invitar integrante</h1>
      <FormularioInvitarIntegrante equipoId={id} />
    </div>
  );
}
