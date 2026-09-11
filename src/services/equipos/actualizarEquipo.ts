import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';
import { invalidarCacheEquipo } from '@/lib/cache';

/**
 * UC-10 — Actualizar los datos de identidad del equipo. Capitán o Delegado.
 *
 * Todo lo que este servicio toca (nombre, escudo, colores, ciudad,
 * modalidad, categoría) se muestra en la ficha pública del equipo, que
 * está cacheada por evento (T23) — sin invalidar acá, un escudo nuevo
 * quedaba guardado en la base pero la ficha seguía mostrando el viejo
 * indefinidamente, porque esta caché no vence por tiempo (reportado en
 * vivo).
 */

const esquemaEntrada = z.object({
  equipoId: z.string().uuid(),
  nombre: z.string().trim().min(1).optional(),
  escudoUrl: z.string().url().optional(),
  colores: z.string().trim().optional(),
  ciudadId: z.string().uuid().optional(),
  modalidadHabitual: z.enum(['f5', 'f7', 'f8', 'f9', 'f11']).optional(),
  categoriaGenero: z.enum(['male', 'female', 'mixed']).optional(),
});

export type ActualizarEquipoInput = z.infer<typeof esquemaEntrada>;

const CAMPOS: Array<[keyof ActualizarEquipoInput, string]> = [
  ['nombre', 'nombre'],
  ['escudoUrl', 'escudo_url'],
  ['colores', 'colores'],
  ['ciudadId', 'ciudad_id'],
  ['modalidadHabitual', 'modalidad_habitual'],
  ['categoriaGenero', 'categoria_genero'],
];

export const actualizarEquipo: Servicio<ActualizarEquipoInput, { id: string }> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilId, datos.equipoId, 'gestionar_plantel');

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

  valores.push(datos.equipoId);
  const { rowCount } = await pool.query(
    `UPDATE equipo SET ${asignaciones.join(', ')} WHERE id = $${valores.length}`,
    valores,
  );
  if (rowCount === 0) throw crearError('NO_ENCONTRADO');

  invalidarCacheEquipo(datos.equipoId);

  return { id: datos.equipoId };
};
