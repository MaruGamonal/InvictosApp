import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';

/**
 * UC-27 — Datos para armar la pantalla de "Lista de buena fe": el
 * plantel activo del equipo, quién de ellos ya está habilitado en este
 * torneo puntual (y con qué rol), y quién no se puede tocar porque ya
 * está habilitado como jugador en otro equipo del mismo torneo (`06`,
 * D-17b) — la misma restricción que el trigger de `integrante_habilitado`
 * (T2) aplica al confirmar, mostrada acá de entrada para que la persona
 * no la descubra recién al fallar el envío.
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid(), equipoId: z.string().uuid() });
export type ObtenerListaDeBuenaFeInput = z.infer<typeof esquemaEntrada>;

export interface IntegranteListaDeBuenaFe {
  perfilId: string;
  nombreVisible: string;
  rolesEquipo: Array<'captain' | 'delegate' | 'player' | 'coach'>;
  /** Rol con el que ya está habilitado en este torneo para este equipo, si lo está. */
  rolHabilitado: 'player' | 'coach' | 'delegate' | null;
  numeroCamiseta: number | null;
  /** Ya es jugador habilitado de OTRO equipo en este mismo torneo — no se puede sumar acá (`06`, D-17b). */
  yaHabilitadoEnOtroEquipo: boolean;
}

export interface ListaDeBuenaFeResultado {
  torneoNombre: string;
  minJugadores: number | null;
  maxJugadores: number | null;
  cerrada: boolean;
  integrantes: IntegranteListaDeBuenaFe[];
}

export const obtenerListaDeBuenaFe: Servicio<
  ObtenerListaDeBuenaFeInput,
  ListaDeBuenaFeResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilId = perfilRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilId, datos.equipoId, 'inscribir_a_torneo');

  const { rows: inscripcionRows } = await pool.query(
    'SELECT 1 FROM inscripcion WHERE torneo_id = $1 AND equipo_id = $2',
    [datos.torneoId, datos.equipoId],
  );
  if (!inscripcionRows[0]) throw crearError('NO_ENCONTRADO');

  const { rows: torneoRows } = await pool.query<{
    nombre: string;
    min_jugadores_lista: number | null;
    max_jugadores_lista: number | null;
    fecha_cierre_lista_buena_fe: Date | null;
    jugador_unico_por_equipo: boolean;
  }>(
    `SELECT nombre, min_jugadores_lista, max_jugadores_lista, fecha_cierre_lista_buena_fe,
            jugador_unico_por_equipo
     FROM torneo WHERE id = $1`,
    [datos.torneoId],
  );
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');

  const { rows: plantel } = await pool.query<{
    perfil_id: string;
    nombre_visible: string;
    rol_equipo: 'captain' | 'delegate' | 'player' | 'coach';
  }>(
    `SELECT ie.perfil_id, pd.nombre_visible, ie.rol_equipo
     FROM integrante_equipo ie
     JOIN perfil_deportivo pd ON pd.id = ie.perfil_id
     WHERE ie.equipo_id = $1 AND ie.estado_vinculo = 'active'
     ORDER BY pd.nombre_visible ASC`,
    [datos.equipoId],
  );

  const { rows: habilitadosPropios } = await pool.query<{
    perfil_id: string;
    rol_en_torneo: 'player' | 'coach' | 'delegate';
    numero_camiseta: number | null;
  }>(
    `SELECT perfil_id, rol_en_torneo, numero_camiseta
     FROM integrante_habilitado
     WHERE torneo_id = $1 AND equipo_id = $2`,
    [datos.torneoId, datos.equipoId],
  );
  const habilitadoPorPerfil = new Map(habilitadosPropios.map((fila) => [fila.perfil_id, fila]));

  let habilitadosEnOtroEquipo = new Set<string>();
  if (torneo.jugador_unico_por_equipo) {
    const { rows } = await pool.query<{ perfil_id: string }>(
      `SELECT perfil_id FROM integrante_habilitado
       WHERE torneo_id = $1 AND equipo_id <> $2 AND rol_en_torneo = 'player'`,
      [datos.torneoId, datos.equipoId],
    );
    habilitadosEnOtroEquipo = new Set(rows.map((fila) => fila.perfil_id));
  }

  const personas = new Map<string, IntegranteListaDeBuenaFe>();
  for (const fila of plantel) {
    const existente = personas.get(fila.perfil_id);
    if (existente) {
      existente.rolesEquipo.push(fila.rol_equipo);
      continue;
    }
    const habilitado = habilitadoPorPerfil.get(fila.perfil_id);
    personas.set(fila.perfil_id, {
      perfilId: fila.perfil_id,
      nombreVisible: fila.nombre_visible,
      rolesEquipo: [fila.rol_equipo],
      rolHabilitado: habilitado?.rol_en_torneo ?? null,
      numeroCamiseta: habilitado?.numero_camiseta ?? null,
      yaHabilitadoEnOtroEquipo: habilitadosEnOtroEquipo.has(fila.perfil_id),
    });
  }

  const cerrada = Boolean(
    torneo.fecha_cierre_lista_buena_fe && torneo.fecha_cierre_lista_buena_fe.getTime() < Date.now(),
  );

  return {
    torneoNombre: torneo.nombre,
    minJugadores: torneo.min_jugadores_lista,
    maxJugadores: torneo.max_jugadores_lista,
    cerrada,
    integrantes: [...personas.values()],
  };
};
