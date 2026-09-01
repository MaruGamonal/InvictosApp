import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoOrganizacion } from '@/lib/permisos';

/** UC-06 — Actualizar los datos públicos de la organización. Titular o Administrador. */

const esquemaEntrada = z.object({
  organizacionId: z.string().uuid(),
  nombre: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().optional(),
  logoUrl: z.string().url().optional(),
  ciudadId: z.string().uuid().optional(),
  contactoNombre: z.string().trim().optional(),
  contactoTelefono: z.string().trim().optional(),
  contactoEmail: z.string().email().optional(),
});

export type ActualizarOrganizacionInput = z.infer<typeof esquemaEntrada>;

const CAMPOS: Array<[keyof ActualizarOrganizacionInput, string]> = [
  ['nombre', 'nombre'],
  ['descripcion', 'descripcion'],
  ['logoUrl', 'logo_url'],
  ['ciudadId', 'ciudad_id'],
  ['contactoNombre', 'contacto_nombre'],
  ['contactoTelefono', 'contacto_telefono'],
  ['contactoEmail', 'contacto_email'],
];

export const actualizarOrganizacion: Servicio<ActualizarOrganizacionInput, { id: string }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoOrganizacion(contexto, datos.organizacionId, 'actualizar_organizacion');

  const asignaciones: string[] = [];
  const valores: unknown[] = [];
  for (const [campoEntrada, columna] of CAMPOS) {
    const valor = datos[campoEntrada];
    if (valor !== undefined) {
      valores.push(valor);
      asignaciones.push(`${columna} = $${valores.length}`);
    }
  }

  if (asignaciones.length === 0) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: '(ninguno)', problema: 'No se envió ningún dato para actualizar.' },
    ]);
  }

  valores.push(datos.organizacionId);
  const pool = obtenerPool();
  const { rowCount } = await pool.query(
    `UPDATE organizacion SET ${asignaciones.join(', ')} WHERE id = $${valores.length}`,
    valores,
  );
  if (rowCount === 0) throw crearError('NO_ENCONTRADO');

  return { id: datos.organizacionId };
};
