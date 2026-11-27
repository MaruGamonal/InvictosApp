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
/**
 * `?siguiente=crear-torneo`: se llegó desde "Crear torneo", que pide una
 * organización primero. Al terminar se vuelve ahí. Es un valor de una
 * lista cerrada y no una URL: una dirección libre en el enlace dejaría
 * armar uno que, al crear la organización, mande a otro sitio.
 */
const SIGUIENTES = {
  'crear-torneo': { href: '/torneo/crear', etiqueta: 'Seguir con el torneo' },
} as const;

export default async function PaginaCrearOrganizacion({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const [{ siguiente }, provincias] = await Promise.all([searchParams, listarCiudadesCacheado()]);
  const destino =
    siguiente && siguiente in SIGUIENTES
      ? SIGUIENTES[siguiente as keyof typeof SIGUIENTES]
      : undefined;

  return <FormularioCrearOrganizacion provincias={provincias} destino={destino} />;
}
