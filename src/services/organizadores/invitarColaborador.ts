import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { obtenerClienteAdmin } from '@/lib/supabase/admin';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { asignarColaborador } from './asignarColaborador';

/**
 * UC-52 — Sumar a alguien como colaborador de este torneo, por email:
 * `asignarColaborador` ya resuelve el vínculo en sí, pero pide un
 * `usuarioId` — acá se resuelve por email primero, igual que
 * `invitarMiembro` (T8) resuelve el equipo de trabajo de la
 * organización: si la persona no tiene cuenta, se la crea `invited`
 * vía la API de administración de Supabase, que le manda el enlace de
 * acceso.
 */

const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  email: z.string().trim().email(),
  nombreCompleto: z.string().trim().min(1).optional(),
});
export type InvitarColaboradorInput = z.infer<typeof esquemaEntrada>;

export const invitarColaborador: Servicio<InvitarColaboradorInput, { usuarioId: string }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'asignar_colaboradores');

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

  await asignarColaborador({ torneoId: datos.torneoId, usuarioId }, contexto);

  return { usuarioId };
};
