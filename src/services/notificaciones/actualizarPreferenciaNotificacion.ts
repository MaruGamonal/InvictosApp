import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { CATEGORIAS_ACCIONABLES, CATEGORIAS_PREFERENCIA } from './preferencias';

/**
 * UC-47 — Prender o apagar un canal de una categoría. Idempotente: la
 * fila de `preferencia_notificacion` representa "apagado", así que
 * activar borra la fila (o no hace nada si no existía) y apagar la
 * inserta (o no hace nada si ya existía) — mismo criterio que
 * `seguir`/`dejarDeSeguir`.
 */

const esquemaEntrada = z.object({
  categoria: z.enum(CATEGORIAS_PREFERENCIA),
  canal: z.enum(['in_app', 'email']),
  activo: z.boolean(),
});
export type ActualizarPreferenciaNotificacionInput = z.infer<typeof esquemaEntrada>;

export const actualizarPreferenciaNotificacion: Servicio<
  ActualizarPreferenciaNotificacionInput,
  void
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  if (!datos.activo && datos.canal === 'in_app' && CATEGORIAS_ACCIONABLES.has(datos.categoria)) {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'canal',
        problema: 'Esta categoría no se puede apagar del todo — solo elegir el canal.',
      },
    ]);
  }

  const pool = obtenerPool();
  if (datos.activo) {
    await pool.query(
      'DELETE FROM preferencia_notificacion WHERE usuario_id = $1 AND categoria = $2 AND canal = $3',
      [contexto.usuarioId, datos.categoria, datos.canal],
    );
  } else {
    await pool.query(
      `INSERT INTO preferencia_notificacion (usuario_id, categoria, canal)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, categoria, canal) DO NOTHING`,
      [contexto.usuarioId, datos.categoria, datos.canal],
    );
  }
};
