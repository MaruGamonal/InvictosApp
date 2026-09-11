import Link from 'next/link';
import type { SolicitudPendiente } from '@/services/equipos/obtenerGestionEquipo';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  solicitudesPendientes: SolicitudPendiente[];
}

/**
 * Solicitudes de ingreso pendientes — Capitán o Delegado. Las
 * invitaciones enviadas ya no viven acá: se muestran directamente en la
 * lista de Plantel (`FilaInvitacionPendiente`, badge "Invitación
 * pendiente"), como en el mockup de UC-14/UC-11.
 */
export function PanelPendientes({ equipoId, solicitudesPendientes }: Props) {
  if (solicitudesPendientes.length === 0) return null;

  return (
    <Link href={`/equipo/${equipoId}/gestionar/solicitudes`} className={styles.enlaceSolicitudes}>
      Ver solicitudes de ingreso ({solicitudesPendientes.length})
    </Link>
  );
}
