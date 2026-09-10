import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerMiInvitacionPendiente } from '@/services/equipos/obtenerMiInvitacionPendiente';
import { Escudo } from '@/components/Escudo';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { conNombreProducto } from '@/lib/nombreProducto';
import { BotonesResponderInvitacion } from './BotonesResponderInvitacion';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Responder invitación') };

/**
 * UC-12 — Responder a la invitación al plantel de este equipo. Se
 * llega acá desde la notificación propia (`team_invitation`); sin una
 * invitación `invited` vigente para quien mira, no hay nada que
 * mostrar — 404, no un error, ya sea porque nunca hubo una o porque ya
 * se respondió antes.
 */
export default async function PaginaResponderInvitacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect(`/ingresar`);

  const invitacion = await obtenerMiInvitacionPendiente({ equipoId: id }, contexto);
  if (!invitacion) notFound();

  const rolesTexto = invitacion.roles
    .map((rol) => obtenerEtiqueta('integranteEquipo.rolEquipo', rol).etiqueta)
    .join(' y ');

  return (
    <div className={styles.pagina}>
      <Escudo src={invitacion.escudoUrl} nombre={invitacion.equipoNombre} tamano={72} />
      <h1 className={`fuente-display ${styles.titulo}`}>
        {invitacion.equipoNombre} te invita
      </h1>
      <p className={styles.texto}>
        Como {rolesTexto}. Podés aceptar o rechazar — rechazar no queda a la vista de nadie.
      </p>
      <BotonesResponderInvitacion equipoId={id} />
    </div>
  );
}
