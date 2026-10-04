'use client';

import { useRouter } from 'next/navigation';
import { useInvitacionPorCorreo } from '@/components/useInvitacionPorCorreo';
import { DESCRIPCION_ADMINISTRADOR } from '@/lib/rolesDeOrganizacion';
import styles from '../../../ingresar/pagina.module.css';

interface Props {
  organizacionId: string;
}

/**
 * UC-07 — Pantalla dedicada de "Invitar administrador". Comparte el
 * envío con el formulario inline de `PanelAdministradores`, vía
 * `useInvitacionPorCorreo`: lo que cambia entre las dos es la pantalla
 * —acá con etiquetas visibles, allá dentro de un acordeón— y qué pasa
 * al terminar, que acá es volver al Equipo de trabajo.
 */
export function FormularioInvitarAdministrador({ organizacionId }: Props) {
  const router = useRouter();
  const invitacion = useInvitacionPorCorreo({
    url: '/api/organizaciones/invitar-administrador',
    datos: { organizacionId },
    mensajeDeFallo: 'No pudimos invitar. Probá de nuevo.',
    alLograrlo: () => {
      router.push('/organizador/gestionar/equipo');
      router.refresh();
    },
  });

  return (
    <form className={styles.tarjeta} onSubmit={invitacion.enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Invitar administrador</h1>
      <p className={styles.texto}>{DESCRIPCION_ADMINISTRADOR}</p>

      {invitacion.error && <p className={styles.error}>{invitacion.error}</p>}

      <div className={styles.campo}>
        <label htmlFor="email">Correo de la persona</label>
        <input
          id="email"
          type="email"
          required
          placeholder="nombre@email.com"
          value={invitacion.email}
          onChange={(evento) => invitacion.cambiarEmail(evento.target.value)}
        />
      </div>

      {invitacion.pideNombre && (
        <div className={styles.campo}>
          <label htmlFor="nombreCompleto">Nombre completo</label>
          <input
            id="nombreCompleto"
            type="text"
            required
            placeholder="Nombre y apellido"
            value={invitacion.nombreCompleto}
            onChange={(evento) => invitacion.cambiarNombreCompleto(evento.target.value)}
          />
        </div>
      )}

      <button
        type="submit"
        className={styles.boton}
        disabled={invitacion.enviando || !invitacion.email.trim()}
      >
        {invitacion.enviando ? 'Invitando…' : 'Invitar administrador'}
      </button>
    </form>
  );
}
