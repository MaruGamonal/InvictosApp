import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoOrganizacion } from '@/lib/permisos';

/**
 * UC-16 — Crear un torneo, siempre en `draft` y visible solo para la
 * organización (`10`, 4.4). La configuración nace con los defaults del
 * amateur documentados en `06`: puntos 3/1/0 (D-20b), desempates
 * diferencia de gol → goles a favor → enfrentamiento directo,
 * `categoria_edad` en `open` (D-38b), walkover 3-0 (D-33b), lista
 * siempre abierta (D-30b) y sin mínimo ni máximo de plantel (D-59). Los
 * defaults viven en la columna del esquema (T2/T9); acá solo se pasan
 * los campos que la persona haya elegido tocar.
 *
 * No hay parámetro de aprobación automática de inscripciones — se
 * eliminó (`06`, D-93) y no se reintroduce acá.
 */

const CRITERIOS_DESEMPATE_VALIDOS = ['goal_difference', 'goals_for', 'head_to_head'] as const;

const esquemaEntrada = z.object({
  organizacionId: z.string().uuid(),
  nombre: z.string().trim().min(1),
  descripcion: z.string().trim().optional(),
  modalidad: z.enum(['f5', 'f7', 'f8', 'f9', 'f11']),
  categoriaGenero: z.enum(['male', 'female', 'mixed']),
  categoriaEdad: z
    .enum(['open', 'u13', 'u15', 'u17', 'u20', 'veterans_35', 'veterans_45'])
    .optional(),
  ciudadId: z.string().uuid(),
  direccion: z.string().trim().optional(),
  formato: z.enum(['league', 'knockout', 'groups_knockout']),
  cupoEquipos: z.number().int().positive(),
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

export type CrearTorneoInput = z.infer<typeof esquemaEntrada>;

const CAMPOS: Array<[keyof CrearTorneoInput, string]> = [
  ['descripcion', 'descripcion'],
  ['categoriaEdad', 'categoria_edad'],
  ['direccion', 'direccion'],
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

export interface CrearTorneoResultado {
  id: string;
  estado: 'draft';
}

export const crearTorneo: Servicio<CrearTorneoInput, CrearTorneoResultado> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoOrganizacion(contexto, datos.organizacionId, 'gestionar_torneos');

  const columnas = [
    'organizacion_id',
    'nombre',
    'modalidad',
    'categoria_genero',
    'ciudad_id',
    'formato',
    'cupo_equipos',
  ];
  const valores: unknown[] = [
    datos.organizacionId,
    datos.nombre,
    datos.modalidad,
    datos.categoriaGenero,
    datos.ciudadId,
    datos.formato,
    datos.cupoEquipos,
  ];

  for (const [campoEntrada, columna] of CAMPOS) {
    const valor = datos[campoEntrada];
    if (valor !== undefined) {
      columnas.push(columna);
      valores.push(valor);
    }
  }
  if (datos.criteriosDesempate !== undefined) {
    columnas.push('criterios_desempate');
    valores.push(JSON.stringify(datos.criteriosDesempate));
  }

  const marcadores = valores.map((_, i) => `$${i + 1}`).join(', ');
  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string; estado: 'draft' }>(
    `INSERT INTO torneo (${columnas.join(', ')}) VALUES (${marcadores}) RETURNING id, estado`,
    valores,
  );

  return { id: rows[0]!.id, estado: rows[0]!.estado };
};
