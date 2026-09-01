import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { TIPOS_NOTIFICACION, esAccionable, type TipoNotificacion } from './tipos';

/**
 * `notificar(tipo, destinatarios, origen)` (`10`, 4.9) es interno y
 * compartido: ningún servicio de dominio arma notificaciones por su
 * cuenta ni decide canales — todos llaman siempre a esta función, igual
 * que `permisos.ts` es el único lugar que decide autorización (T4). La
 * arquitectura lo hace cumplir en `notificar.arquitectura.test.ts`.
 *
 * Resuelve destinatarios en dos partes: las partes involucradas, que el
 * llamador ya conoce (`usuarioIds`), y los seguidores de una entidad
 * (`seguidoresDe`), que esta función busca en `seguimiento`. Aplica la
 * regla de canal (`06`, D-53) y registra un `notificacion` por canal.
 *
 * Se ejecuta fuera de la transacción del llamador a propósito: un aviso
 * es un efecto secundario del hecho de negocio, no parte de su
 * invariante. Se llama después de que la operación principal ya
 * confirmó, para que una notificación fallida nunca revierta el hecho de
 * negocio ni al revés.
 */

const esquemaEntrada = z.object({
  tipo: z.enum(TIPOS_NOTIFICACION as unknown as [TipoNotificacion, ...TipoNotificacion[]]),
  entidadOrigenTipo: z.string().optional(),
  entidadOrigenId: z.string().uuid().optional(),
  destinatarios: z.object({
    usuarioIds: z.array(z.string().uuid()).optional(),
    seguidoresDe: z
      .array(
        z.object({
          tipoSeguido: z.enum(['tournament', 'team']),
          entidadId: z.string().uuid(),
        }),
      )
      .optional(),
  }),
});

export type NotificarInput = z.infer<typeof esquemaEntrada>;

export const notificar: Servicio<NotificarInput, void> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const usuarioIds = new Set(datos.destinatarios.usuarioIds ?? []);
  for (const seguido of datos.destinatarios.seguidoresDe ?? []) {
    const { rows } = await pool.query<{ usuario_id: string }>(
      'SELECT usuario_id FROM seguimiento WHERE tipo_seguido = $1 AND entidad_seguida_id = $2',
      [seguido.tipoSeguido, seguido.entidadId],
    );
    for (const fila of rows) usuarioIds.add(fila.usuario_id);
  }
  if (usuarioIds.size === 0) return;

  const canales: Array<'in_app' | 'email'> = esAccionable(datos.tipo)
    ? ['in_app', 'email']
    : ['in_app'];

  const valores: unknown[] = [];
  const marcadores: string[] = [];
  for (const usuarioId of usuarioIds) {
    for (const canal of canales) {
      valores.push(
        usuarioId,
        datos.tipo,
        datos.entidadOrigenTipo ?? null,
        datos.entidadOrigenId ?? null,
        canal,
      );
      const base = valores.length - 5;
      marcadores.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    }
  }

  await pool.query(
    `INSERT INTO notificacion (usuario_id, tipo, entidad_origen_tipo, entidad_origen_id, canal)
     VALUES ${marcadores.join(', ')}`,
    valores,
  );
};
