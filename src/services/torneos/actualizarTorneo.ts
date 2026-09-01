import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-19 — Actualizar la configuración de un torneo. El cupo **no puede
 * bajarse** por debajo de la cantidad de equipos ya aprobados (`06`,
 * A-04, confirmado en D-68).
 *
 * Qué campos disparan notificación al modificar un torneo **publicado**
 * (`06`, D-22b) es una regla que solo aplica una vez que el torneo deja
 * `draft` — T10, que además es quien construye `notificar()` para D4.
 * Este ticket no envía notificaciones.
 */

const CRITERIOS_DESEMPATE_VALIDOS = ['goal_difference', 'goals_for', 'head_to_head'] as const;

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  nombre: z.string().trim().min(1).optional(),
  descripcion: z.string().trim().optional(),
  categoriaEdad: z
    .enum(['open', 'u13', 'u15', 'u17', 'u20', 'veterans_35', 'veterans_45'])
    .optional(),
  direccion: z.string().trim().optional(),
  cupoEquipos: z.number().int().positive().optional(),
  minJugadoresLista: z.number().int().positive().optional(),
  maxJugadoresLista: z.number().int().positive().optional(),
  puntosVictoria: z.number().int().nonnegative().optional(),
  puntosEmpate: z.number().int().nonnegative().optional(),
  puntosDerrota: z.number().int().nonnegative().optional(),
  criteriosDesempate: z.array(z.enum(CRITERIOS_DESEMPATE_VALIDOS)).min(1).optional(),
  fechaInicioEstimada: z.string().datetime().optional(),
  fechaFinEstimada: z.string().datetime().optional(),
  jugadorUnicoPorEquipo: z.boolean().optional(),
  soloOrganizadorCargaResultados: z.boolean().optional(),
  partidosPendientesPorAbandono: z.enum(['ganados_por_rival', 'anulados']).optional(),
  golesWalkoverGanador: z.number().int().nonnegative().optional(),
  golesWalkoverPerdedor: z.number().int().nonnegative().optional(),
  fechaCierreListaBuenaFe: z.string().datetime().optional(),
});

export type ActualizarTorneoInput = z.infer<typeof esquemaEntrada>;

const CAMPOS: Array<[keyof ActualizarTorneoInput, string]> = [
  ['nombre', 'nombre'],
  ['descripcion', 'descripcion'],
  ['categoriaEdad', 'categoria_edad'],
  ['direccion', 'direccion'],
  ['cupoEquipos', 'cupo_equipos'],
  ['minJugadoresLista', 'min_jugadores_lista'],
  ['maxJugadoresLista', 'max_jugadores_lista'],
  ['puntosVictoria', 'puntos_victoria'],
  ['puntosEmpate', 'puntos_empate'],
  ['puntosDerrota', 'puntos_derrota'],
  ['fechaInicioEstimada', 'fecha_inicio_estimada'],
  ['fechaFinEstimada', 'fecha_fin_estimada'],
  ['jugadorUnicoPorEquipo', 'jugador_unico_por_equipo'],
  ['soloOrganizadorCargaResultados', 'solo_organizador_carga_resultados'],
  ['partidosPendientesPorAbandono', 'partidos_pendientes_por_abandono'],
  ['golesWalkoverGanador', 'goles_walkover_ganador'],
  ['golesWalkoverPerdedor', 'goles_walkover_perdedor'],
  ['fechaCierreListaBuenaFe', 'fecha_cierre_lista_buena_fe'],
];

export const actualizarTorneo: Servicio<ActualizarTorneoInput, { id: string }> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();

  if (datos.cupoEquipos !== undefined) {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT count(*) FROM inscripcion WHERE torneo_id = $1 AND estado = 'approved'`,
      [datos.torneoId],
    );
    const aprobados = Number(rows[0]!.count);
    if (datos.cupoEquipos < aprobados) throw crearError('CUPO_MENOR_A_INSCRIPTOS');
  }

  const asignaciones: string[] = [];
  const valores: unknown[] = [];
  for (const [campoEntrada, columna] of CAMPOS) {
    const valor = datos[campoEntrada];
    if (valor !== undefined) {
      valores.push(campoEntrada === 'criteriosDesempate' ? JSON.stringify(valor) : valor);
      asignaciones.push(`${columna} = $${valores.length}`);
    }
  }
  if (datos.criteriosDesempate !== undefined) {
    valores.push(JSON.stringify(datos.criteriosDesempate));
    asignaciones.push(`criterios_desempate = $${valores.length}`);
  }

  if (asignaciones.length === 0) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: '(ninguno)', problema: 'No se envió ningún dato para actualizar.' },
    ]);
  }

  asignaciones.push('version = version + 1');
  valores.push(datos.torneoId);
  const { rowCount } = await pool.query(
    `UPDATE torneo SET ${asignaciones.join(', ')} WHERE id = $${valores.length}`,
    valores,
  );
  if (rowCount === 0) throw crearError('NO_ENCONTRADO');

  return { id: datos.torneoId };
};
