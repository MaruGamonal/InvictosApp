import { redirect } from 'next/navigation';
import { obtenerGestionCacheada } from './_datos';

/**
 * `/gestionar` a secas redirige a la primera pestaña de quien mira — el
 * layout ya resolvió el guard de permisos.
 *
 * Para un Colaborador la primera no es Resumen sino Resultados: Resumen
 * no es suyo (`06`, D-32) y mandarlo ahí sería rebotarlo apenas entra.
 */
export default async function PaginaGestionar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);
  const primera = gestion.miRolEnTorneo === 'organizacion' ? 'resumen' : 'resultados';
  redirect(`/torneo/${id}/gestionar/${primera}`);
}
