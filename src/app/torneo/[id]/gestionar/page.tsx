import { redirect } from 'next/navigation';

/** `/gestionar` a secas redirige a la primera pestaña — el layout ya resolvió el guard de permisos. */
export default async function PaginaGestionar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/torneo/${id}/gestionar/resumen`);
}
