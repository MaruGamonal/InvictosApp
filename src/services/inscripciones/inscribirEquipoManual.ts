import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { cerrarTorneoSiCupoCompleto } from './_cupo';

/**
 * UC-26 — Cargar un equipo a mano, la funcionalidad que `07` declara
 * innegociable en el MVP: el primer organizador llega con equipos que
 * no tienen cuenta. Equipo existente **o** datos mínimos de uno nuevo.
 *
 * Si el equipo no existe, se lo crea **sin capitán asignado** —
 * reclamable después, mismo mecanismo que el perfil de jugador (`06`,
 * D-29b) — y queda `approved` en un solo paso, sin pasar por `pending`
 * ni por la lista de espera: eso es para lo que solicita un equipo
 * desde afuera (UC-24, T20), no para lo que el organizador ya decidió.
 */

const esquemaEntrada = z
  .object({
    torneoId: z.string().uuid(),
    equipoId: z.string().uuid().optional(),
    nombre: z.string().trim().min(1).optional(),
    categoriaGenero: z.enum(['male', 'female', 'mixed']).optional(),
    ciudadId: z.string().uuid().optional(),
  })
  .refine((d) => Boolean(d.equipoId) !== Boolean(d.nombre), {
    message: 'Hay que indicar un equipo existente o los datos de uno nuevo, no los dos ni ninguno.',
  })
  .refine((d) => !d.nombre || Boolean(d.categoriaGenero), {
    message: 'La categoría de género es obligatoria para un equipo nuevo.',
    path: ['categoriaGenero'],
  });
export type InscribirEquipoManualInput = z.infer<typeof esquemaEntrada>;

export interface InscribirEquipoManualResultado {
  equipoId: string;
  advertenciaCategoria: boolean;
}

export const inscribirEquipoManual: Servicio<
  InscribirEquipoManualInput,
  InscribirEquipoManualResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'resolver_inscripciones');

  const pool = obtenerPool();
  const { rows: torneoRows } = await pool.query<{
    estado: string;
    categoria_genero: string;
    cupo_equipos: number;
  }>('SELECT estado, categoria_genero, cupo_equipos FROM torneo WHERE id = $1', [datos.torneoId]);
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');
  if (torneo.estado !== 'registration_open') throw crearError('INSCRIPCIONES_CERRADAS');

  const { rows: aprobados } = await pool.query<{ count: string }>(
    `SELECT count(*) FROM inscripcion WHERE torneo_id = $1 AND estado = 'approved'`,
    [datos.torneoId],
  );
  if (Number(aprobados[0]!.count) >= torneo.cupo_equipos) throw crearError('CUPO_COMPLETO');

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    let equipoId: string;
    let categoriaGeneroEquipo: string;

    if (datos.equipoId) {
      const { rows } = await cliente.query<{ id: string; categoria_genero: string }>(
        'SELECT id, categoria_genero FROM equipo WHERE id = $1',
        [datos.equipoId],
      );
      const equipo = rows[0];
      if (!equipo) throw crearError('NO_ENCONTRADO');

      const { rows: existente } = await cliente.query(
        'SELECT 1 FROM inscripcion WHERE torneo_id = $1 AND equipo_id = $2',
        [datos.torneoId, equipo.id],
      );
      if (existente.length > 0) {
        throw crearError('DATOS_INVALIDOS', [
          {
            campo: 'equipoId',
            problema: 'Este equipo ya tiene una inscripción registrada en este torneo.',
          },
        ]);
      }

      equipoId = equipo.id;
      categoriaGeneroEquipo = equipo.categoria_genero;
    } else {
      const { rows } = await cliente.query<{ id: string }>(
        `INSERT INTO equipo (nombre, categoria_genero, ciudad_id, creado_por_usuario_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [datos.nombre, datos.categoriaGenero, datos.ciudadId ?? null, contexto.usuarioId],
      );
      equipoId = rows[0]!.id;
      categoriaGeneroEquipo = datos.categoriaGenero!;
    }

    const advertenciaCategoria =
      torneo.categoria_genero !== 'mixed' && categoriaGeneroEquipo !== torneo.categoria_genero;

    await cliente.query(
      `INSERT INTO inscripcion
         (torneo_id, equipo_id, estado, advertencia_categoria, solicitada_por_usuario_id, resuelta_por_usuario_id, fecha_resolucion)
       VALUES ($1, $2, 'approved', $3, $4, $4, now())`,
      [datos.torneoId, equipoId, advertenciaCategoria, contexto.usuarioId],
    );

    await cerrarTorneoSiCupoCompleto(cliente, datos.torneoId);

    await cliente.query('COMMIT');
    return { equipoId, advertenciaCategoria };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
