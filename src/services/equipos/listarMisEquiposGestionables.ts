import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { listarEquiposGestionablesPorPerfil } from '@/lib/permisos';

/**
 * Equipos donde la persona es Capitana o Delegada — los únicos roles que
 * pueden inscribir un equipo a un torneo (`lib/permisos.ts`,
 * `verificarPermisoEquipo`, `'inscribir_a_torneo'`). Alimenta el
 * selector de "a cuál de mis equipos inscribo" en la ficha del torneo.
 */

export interface EquipoGestionable {
  id: string;
  nombre: string;
  escudoUrl: string | null;
  categoriaGenero: string;
}

export const listarMisEquiposGestionables: Servicio<void, EquipoGestionable[]> = async (
  _input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id;
  if (!perfilId) return [];

  const equipoIds = await listarEquiposGestionablesPorPerfil(perfilId);
  if (equipoIds.length === 0) return [];

  const { rows } = await pool.query<{
    id: string;
    nombre: string;
    escudo_url: string | null;
    categoria_genero: string;
  }>(
    `SELECT id, nombre, escudo_url, categoria_genero FROM equipo
     WHERE id = ANY($1) AND estado = 'active' ORDER BY nombre`,
    [equipoIds],
  );

  return rows.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    escudoUrl: fila.escudo_url,
    categoriaGenero: fila.categoria_genero,
  }));
};
