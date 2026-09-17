import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import {
  CATEGORIAS_ACCIONABLES,
  CATEGORIAS_PREFERENCIA,
  type CategoriaPreferencia,
} from './preferencias';

/**
 * UC-47 — Las seis categorías de preferencia con su estado actual.
 * Ausencia de fila en `preferencia_notificacion` es el default (todo
 * prendido, `06` D-53), así que esto siempre devuelve las seis, nunca
 * solo las que el usuario tocó alguna vez.
 */
export interface PreferenciaCategoria {
  categoria: CategoriaPreferencia;
  accionable: boolean;
  inAppActivo: boolean;
  emailActivo: boolean;
}

export const obtenerPreferenciasNotificacion: Servicio<void, PreferenciaCategoria[]> = async (
  _input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ categoria: CategoriaPreferencia; canal: 'in_app' | 'email' }>(
    'SELECT categoria, canal FROM preferencia_notificacion WHERE usuario_id = $1',
    [contexto.usuarioId],
  );
  const apagados = new Set(rows.map((r) => `${r.categoria}:${r.canal}`));

  return CATEGORIAS_PREFERENCIA.map((categoria) => ({
    categoria,
    accionable: CATEGORIAS_ACCIONABLES.has(categoria),
    inAppActivo: !apagados.has(`${categoria}:in_app`),
    emailActivo: !apagados.has(`${categoria}:email`),
  }));
};
