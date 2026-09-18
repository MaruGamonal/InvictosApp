import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerOrganizacionActivaCacheada } from '../_datos';
import { FormularioInvitarAdministrador } from './FormularioInvitarAdministrador';
import styles from '../equipo/pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Invitar Administrador') };

/** UC-07 — Sumar un Administrador al equipo de trabajo. Solo el Titular (`06`, D-64). */
export default async function PaginaInvitarAdministrador() {
  const organizacion = await obtenerOrganizacionActivaCacheada();
  if (!organizacion) redirect('/organizador/gestionar/crear');

  if (organizacion.rol !== 'owner') {
    return (
      <div className={styles.contenidoPagina}>
        <h1 className={styles.titulo}>Invitar Administrador</h1>
        <p className={styles.aviso}>
          Solo el Titular puede invitar administradores a la organización.
        </p>
      </div>
    );
  }

  return <FormularioInvitarAdministrador organizacionId={organizacion.organizacionId} />;
}
