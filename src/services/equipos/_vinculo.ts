import type { PoolClient } from 'pg';

/**
 * `IntegranteEquipo.estado_vinculo` (`04`, 3.6) — helper interno,
 * compartido entre `invitarIntegrante` y `solicitarIngreso`, que son las
 * dos caras del mismo mecanismo (`06`, D-85): una invitación propone
 * hacia adentro, una solicitud propone hacia afuera, y si las dos
 * propuestas se cruzan, **es la misma fila** la que pasa a `active`, sin
 * crear una segunda ni pedir un paso más (`10`, 2.6).
 */

export type EstadoVinculo = 'invited' | 'requested' | 'active' | 'left' | 'declined' | 'cancelled';
export type RolEquipo = 'captain' | 'delegate' | 'player' | 'coach';

export async function upsertVinculo(
  cliente: PoolClient,
  params: {
    equipoId: string;
    perfilId: string;
    rol: RolEquipo;
    /** Qué propuesta representa esta llamada: invitar o solicitar. */
    estadoPropuesto: 'invited' | 'requested';
    /** A qué estado va si no hay una propuesta contraria pendiente con la que cruzarse. */
    estadoSiSinContraparte: EstadoVinculo;
  },
): Promise<{ estadoResultante: EstadoVinculo; huboCruce: boolean }> {
  const { equipoId, perfilId, rol, estadoPropuesto, estadoSiSinContraparte } = params;
  const contraparte: EstadoVinculo = estadoPropuesto === 'invited' ? 'requested' : 'invited';

  const { rows } = await cliente.query<{ estado_vinculo: EstadoVinculo }>(
    `SELECT estado_vinculo FROM integrante_equipo WHERE equipo_id = $1 AND perfil_id = $2 AND rol_equipo = $3`,
    [equipoId, perfilId, rol],
  );
  const actual = rows[0]?.estado_vinculo;

  // Ya está donde tiene que estar: idempotente, no hace nada más.
  if (actual === 'active' || actual === estadoPropuesto) {
    return { estadoResultante: actual, huboCruce: false };
  }

  const huboCruce = actual === contraparte;
  const estadoResultante: EstadoVinculo = huboCruce ? 'active' : estadoSiSinContraparte;
  const fechaIncorporacion = estadoResultante === 'active' ? new Date() : null;

  if (actual === undefined) {
    await cliente.query(
      `INSERT INTO integrante_equipo (equipo_id, perfil_id, rol_equipo, estado_vinculo, fecha_incorporacion)
       VALUES ($1, $2, $3, $4, $5)`,
      [equipoId, perfilId, rol, estadoResultante, fechaIncorporacion],
    );
  } else {
    // actual es la contraparte (cruce) o un estado terminal (`declined`,
    // `cancelled`, `left`): en los tres casos es la misma fila la que se
    // reactiva, nunca una fila nueva.
    await cliente.query(
      `UPDATE integrante_equipo SET estado_vinculo = $4, fecha_incorporacion = $5, fecha_baja = NULL
       WHERE equipo_id = $1 AND perfil_id = $2 AND rol_equipo = $3`,
      [equipoId, perfilId, rol, estadoResultante, fechaIncorporacion],
    );
  }

  return { estadoResultante, huboCruce };
}

/** Sigue automáticamente a un equipo (UC-42/43) al entrar al plantel (`06`, D-85, D-86). */
export async function seguirEquipoAutomaticamente(
  cliente: PoolClient,
  usuarioId: string,
  equipoId: string,
): Promise<void> {
  await cliente.query(
    `INSERT INTO seguimiento (usuario_id, tipo_seguido, entidad_seguida_id, origen)
     VALUES ($1, 'team', $2, 'automatico')
     ON CONFLICT (usuario_id, tipo_seguido, entidad_seguida_id) DO NOTHING`,
    [usuarioId, equipoId],
  );
}
