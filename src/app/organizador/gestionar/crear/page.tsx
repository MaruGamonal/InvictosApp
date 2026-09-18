import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { listarCiudadesCacheado } from '@/app/torneos/_datos';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioCrearOrganizacion } from './FormularioCrearOrganizacion';

export const metadata: Metadata = { title: conNombreProducto('Crear organización') };

/**
 * UC-06 — Crear organización, desde el panel de Organizador. Sin el
 * wrapper `.pagina` de `/torneo/crear` (min-height:100vh propio): acá
 * el layout de `/organizador/gestionar` ya pone el header, el bottom
 * nav y el `max-width`/padding del contenido.
 */
export default async function PaginaCrearOrganizacion() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const provincias = await listarCiudadesCacheado();

  return <FormularioCrearOrganizacion provincias={provincias} />;
}
