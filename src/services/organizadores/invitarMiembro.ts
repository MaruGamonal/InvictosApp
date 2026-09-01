import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoOrganizacion } from '@/lib/permisos';
import { obtenerClienteAdmin } from '@/lib/supabase/admin';

/**
 * UC-07 — Sumar a alguien al equipo de trabajo de la organización, como
 * Administrador. El rol de Titular no se asigna por esta vía (`02`,
 * UC-07, UC-09) y solo lo puede hacer el propio Titular (`06`, D-64):
 * un Administrador que invita a otro queda en `ADMIN_NO_PUEDE_GESTIONAR_ADMINS`.
 *
 * Si la persona no tiene cuenta, se la crea en `invited` (`04`, 3.1) vía
 * la API de administración de Supabase, que le envía el enlace de
 * acceso — a diferencia de UC-01, acá el titular ya identificó a una
 * persona real, así que el vínculo se crea de inmediato, sin esperar a
 * que confirme.
 *
 * Idempotente (`10`, 2.6): invitar dos veces no duplica el vínculo. Si
 * la persona sigue `invited` (no confirmó todavía), se le reenvía el
 * acceso — es el mecanismo natural para "no me llegó el correo".
 */

const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const esquemaEntrada = z.object({
  organizacionId: z.string().uuid(),
  email: z.string().trim().email(),
  nombreCompleto: z.string().trim().min(1).optional(),
});
export type InvitarMiembroInput = z.infer<typeof esquemaEntrada>;

export interface InvitarMiembroResultado {
  usuarioId: string;
  rol: 'admin';
}

export const invitarMiembro: Servicio<InvitarMiembroInput, InvitarMiembroResultado> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoOrganizacion(contexto, datos.organizacionId, 'gestionar_administradores');

  const pool = obtenerPool();
  const { rows: existente } = await pool.query<{ id: string; estado: string }>(
    'SELECT id, estado FROM usuario WHERE email = $1',
    [datos.email],
  );

  let usuarioId: string;
  if (existente[0]) {
    usuarioId = existente[0].id;
    if (existente[0].estado === 'invited') {
      const supabase = obtenerClienteAdmin();
      await supabase.auth.admin.inviteUserByEmail(datos.email, {
        redirectTo: `${URL_DEL_SITIO()}/auth/callback`,
      });
    }
  } else {
    if (!datos.nombreCompleto) {
      throw crearError('DATOS_INVALIDOS', [
        { campo: 'nombreCompleto', problema: 'Hace falta el nombre para invitar a alguien nuevo.' },
      ]);
    }

    const supabase = obtenerClienteAdmin();
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(datos.email, {
      redirectTo: `${URL_DEL_SITIO()}/auth/callback`,
      data: { nombre_visible: datos.nombreCompleto },
    });
    if (error || !data.user) {
      throw crearError('ERROR_INTERNO', { motivo: 'no se pudo enviar el enlace de acceso' });
    }

    usuarioId = data.user.id;
    await pool.query(
      `INSERT INTO usuario (id, email, nombre_completo, estado) VALUES ($1, $2, $3, 'invited')`,
      [usuarioId, datos.email, datos.nombreCompleto],
    );
  }

  await pool.query(
    `INSERT INTO miembro_organizacion (usuario_id, organizacion_id, rol) VALUES ($1, $2, 'admin')
     ON CONFLICT (organizacion_id, usuario_id, rol) DO NOTHING`,
    [usuarioId, datos.organizacionId],
  );

  return { usuarioId, rol: 'admin' };
};
