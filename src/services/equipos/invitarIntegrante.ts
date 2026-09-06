import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoEquipo } from '@/lib/permisos';
import { notificar } from '@/services/notificaciones/notificar';
import { upsertVinculo, type EstadoVinculo, type RolEquipo } from './_vinculo';

/**
 * UC-11 — Invitar integrantes al plantel, por Capitán o Delegado. Tres
 * caminos (`10`, 4.3): la persona **tiene cuenta** → vínculo `invited` +
 * notifica; **no tiene cuenta** → se crea su `perfil_deportivo` en
 * `unclaimed` y el vínculo queda `active` directo; el vínculo **ya
 * existe** → idempotente.
 *
 * El rol viaja en la invitación: una invitación con varios roles crea
 * **un vínculo por rol** (`06`, D-23).
 *
 * **Revisión 15, D-98b:** al crear un perfil nuevo (persona sin cuenta),
 * avisa —sin bloquear— si el nombre coincide con uno ya existente.
 * Mismo patrón que el nombre de equipo repetido (D-16b): es el atajo
 * que toma el capitán apurado, y el daño de dos perfiles para la misma
 * persona no se ve el domingo sino un año después, partiendo su
 * historial en dos.
 */

const ROLES_INVITABLES = ['player', 'delegate', 'coach'] as const;

const esquemaEntrada = z
  .object({
    equipoId: z.string().uuid(),
    roles: z.array(z.enum(ROLES_INVITABLES)).min(1),
    perfilId: z.string().uuid().optional(),
    nombreVisible: z.string().trim().min(1).optional(),
  })
  .refine((d) => Boolean(d.perfilId) !== Boolean(d.nombreVisible), {
    message:
      'Hay que indicar un perfil existente o los datos mínimos de una persona nueva, no los dos ni ninguno.',
  });

export type InvitarIntegranteInput = z.infer<typeof esquemaEntrada>;

export interface InvitarIntegranteResultado {
  perfilId: string;
  vinculos: Array<{ rol: RolEquipo; estado: EstadoVinculo }>;
  /** Solo puede ser `true` cuando se creó un perfil nuevo (`06`, D-98b); si se invitó a uno existente, siempre `false`. */
  advertenciaNombreDuplicado: boolean;
}

export const invitarIntegrante: Servicio<
  InvitarIntegranteInput,
  InvitarIntegranteResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const pool = obtenerPool();
  const { rows: perfilPropioRows } = await pool.query<{ id: string }>(
    'SELECT id FROM perfil_deportivo WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const perfilPropioId = perfilPropioRows[0]?.id ?? null;
  await verificarPermisoEquipo(contexto, perfilPropioId, datos.equipoId, 'gestionar_plantel');

  const cliente = await pool.connect();
  let perfilId: string;
  let usuarioIdDestino: string | null;
  let advertenciaNombreDuplicado = false;
  try {
    await cliente.query('BEGIN');

    if (datos.perfilId) {
      const { rows } = await cliente.query<{ id: string; usuario_id: string | null }>(
        'SELECT id, usuario_id FROM perfil_deportivo WHERE id = $1',
        [datos.perfilId],
      );
      const perfil = rows[0];
      if (!perfil) throw crearError('NO_ENCONTRADO');
      perfilId = perfil.id;
      usuarioIdDestino = perfil.usuario_id;
    } else {
      const { rows: coincidencias } = await cliente.query(
        'SELECT 1 FROM perfil_deportivo WHERE lower(nombre_visible) = lower($1)',
        [datos.nombreVisible],
      );
      advertenciaNombreDuplicado = coincidencias.length > 0;

      const { rows } = await cliente.query<{ id: string }>(
        `INSERT INTO perfil_deportivo (nombre_visible, visibilidad, estado_reclamo, creado_por_usuario_id)
         VALUES ($1, 'restricted', 'unclaimed', $2) RETURNING id`,
        [datos.nombreVisible, contexto.usuarioId],
      );
      perfilId = rows[0]!.id;
      usuarioIdDestino = null;
    }

    const tieneCuenta = usuarioIdDestino !== null;
    const vinculos: Array<{ rol: RolEquipo; estado: EstadoVinculo }> = [];

    for (const rol of datos.roles) {
      const { estadoResultante } = await upsertVinculo(cliente, {
        equipoId: datos.equipoId,
        perfilId,
        rol,
        estadoPropuesto: 'invited',
        estadoSiSinContraparte: tieneCuenta ? 'invited' : 'active',
      });
      vinculos.push({ rol, estado: estadoResultante });
    }

    await cliente.query('COMMIT');

    const quedoInvitada = vinculos.some((v) => v.estado === 'invited');
    if (quedoInvitada && usuarioIdDestino) {
      await notificar(
        {
          tipo: 'team_invitation',
          entidadOrigenTipo: 'equipo',
          entidadOrigenId: datos.equipoId,
          destinatarios: { usuarioIds: [usuarioIdDestino] },
        },
        contexto,
      );
    }

    return { perfilId, vinculos, advertenciaNombreDuplicado };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
