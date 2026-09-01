import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-10 — Crear un equipo: entidad permanente y transversal a los
 * torneos (`06`, D-10, D-13), no una fila de inscripción. Quien lo crea
 * queda como Capitán, con **exactamente un** vínculo `captain` (`04`,
 * 3.5) y como `equipo.perfil_capitan_id` (D-13).
 *
 * `categoriaGenero` es obligatoria y sin valor por defecto (`06`,
 * D-81): preseleccionar algo dejaría cargados como masculinos a la
 * mitad de los equipos femeninos.
 */

const esquemaEntrada = z.object({
  nombre: z.string().trim().min(1),
  escudoUrl: z.string().url().optional(),
  colores: z.string().trim().optional(),
  ciudadId: z.string().uuid().optional(),
  modalidadHabitual: z.enum(['f5', 'f7', 'f8', 'f9', 'f11']).optional(),
  categoriaGenero: z.enum(['male', 'female', 'mixed']),
});

export type CrearEquipoInput = z.infer<typeof esquemaEntrada>;

export interface CrearEquipoResultado {
  id: string;
  /** El nombre no es único (`06`, D-16b): esto solo avisa, nunca bloquea. */
  advertenciaNombreDuplicado: boolean;
}

export const crearEquipo: Servicio<CrearEquipoInput, CrearEquipoResultado> = async (
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
  const perfilId = perfilRows[0]?.id;
  if (!perfilId) throw crearError('NO_ENCONTRADO');

  let advertenciaNombreDuplicado = false;
  if (datos.ciudadId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM equipo WHERE lower(nombre) = lower($1) AND ciudad_id = $2 AND estado = 'active'`,
      [datos.nombre, datos.ciudadId],
    );
    advertenciaNombreDuplicado = rows.length > 0;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rows } = await cliente.query<{ id: string }>(
      `INSERT INTO equipo
         (nombre, escudo_url, colores, ciudad_id, modalidad_habitual, categoria_genero, perfil_capitan_id, creado_por_usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        datos.nombre,
        datos.escudoUrl ?? null,
        datos.colores ?? null,
        datos.ciudadId ?? null,
        datos.modalidadHabitual ?? null,
        datos.categoriaGenero,
        perfilId,
        contexto.usuarioId,
      ],
    );
    const equipoId = rows[0]!.id;

    await cliente.query(
      `INSERT INTO integrante_equipo (equipo_id, perfil_id, rol_equipo, estado_vinculo, fecha_incorporacion)
       VALUES ($1, $2, 'captain', 'active', now())`,
      [equipoId, perfilId],
    );

    await cliente.query('COMMIT');
    return { id: equipoId, advertenciaNombreDuplicado };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
