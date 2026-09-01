import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-06 — Crear organización. Libre y automática: nace en `unverified`
 * (default del esquema) y puede gestionar todo el producto de gestión
 * desde el minuto uno (`06`, D-51). Quien la crea queda como Titular.
 */

const esquemaEntrada = z.object({
  nombre: z.string().trim().min(1),
  descripcion: z.string().trim().optional(),
  logoUrl: z.string().url().optional(),
  ciudadId: z.string().uuid().optional(),
  contactoNombre: z.string().trim().optional(),
  contactoTelefono: z.string().trim().optional(),
  contactoEmail: z.string().email().optional(),
});

export type CrearOrganizacionInput = z.infer<typeof esquemaEntrada>;
export interface CrearOrganizacionResultado {
  id: string;
  nivelVerificacion: 'unverified';
}

export const crearOrganizacion: Servicio<
  CrearOrganizacionInput,
  CrearOrganizacionResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rows } = await cliente.query<{ id: string }>(
      `INSERT INTO organizacion
         (nombre, descripcion, logo_url, ciudad_id, usuario_titular_id, contacto_nombre, contacto_telefono, contacto_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        datos.nombre,
        datos.descripcion ?? null,
        datos.logoUrl ?? null,
        datos.ciudadId ?? null,
        contexto.usuarioId,
        datos.contactoNombre ?? null,
        datos.contactoTelefono ?? null,
        datos.contactoEmail ?? null,
      ],
    );

    const organizacionId = rows[0]!.id;

    // Registro espejo en miembro_organizacion (`03`, 3.4): el rol de titular
    // aparece de forma consistente al listar el equipo de trabajo, pero se
    // crea y actualiza únicamente junto con organizacion.usuario_titular_id.
    await cliente.query(
      `INSERT INTO miembro_organizacion (usuario_id, organizacion_id, rol) VALUES ($1, $2, 'owner')`,
      [contexto.usuarioId, organizacionId],
    );

    await cliente.query('COMMIT');
    return { id: organizacionId, nivelVerificacion: 'unverified' };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
