import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { listarCiudadesCacheado } from '@/app/torneos/_datos';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioCrearTorneo } from './FormularioCrearTorneo';
import styles from '../../ingresar/pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Crear torneo') };

/**
 * UC-16 — Crear torneo (Flujo 3 del paquete de diseño). Pide sesión
 * real; `POST /api/torneos` resuelve sola la organización si hace falta
 * (`asegurarOrganizacionPropia`), así que esta pantalla no pide elegir
 * ninguna.
 */
export default async function PaginaCrearTorneo() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const provincias = await listarCiudadesCacheado();

  return (
    <div className={styles.pagina}>
      <FormularioCrearTorneo provincias={provincias} />
    </div>
  );
}
