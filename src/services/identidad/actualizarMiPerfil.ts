import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-02 — Completar y mantener el perfil deportivo. Todo opcional
 * (`06`, D-52, D-13b): un perfil incompleto nunca bloquea nada.
 */

const esquemaEntrada = z.object({
  nombreVisible: z.string().trim().min(1).optional(),
  fotoUrl: z.string().url().optional(),
  posicion: z.enum(['goalkeeper', 'defender', 'midfielder', 'forward', 'unspecified']).optional(),
  ciudadId: z.string().uuid().optional(),
});

export type ActualizarMiPerfilInput = z.infer<typeof esquemaEntrada>;

const CAMPOS: Array<[keyof ActualizarMiPerfilInput, string]> = [
  ['nombreVisible', 'nombre_visible'],
  ['fotoUrl', 'foto_url'],
  ['posicion', 'posicion'],
  ['ciudadId', 'ciudad_id'],
];

export const actualizarMiPerfil: Servicio<ActualizarMiPerfilInput, { id: string }> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);

  const asignaciones: string[] = [];
  const valores: unknown[] = [];
  for (const [campoEntrada, columna] of CAMPOS) {
    const valor = datos[campoEntrada];
    if (valor !== undefined) {
      valores.push(valor);
      asignaciones.push(`${columna} = $${valores.length}`);
    }
  }
  if (asignaciones.length === 0) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: '(ninguno)', problema: 'No se envió ningún dato para actualizar.' },
    ]);
  }

  valores.push(contexto.usuarioId);
  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE perfil_deportivo SET ${asignaciones.join(', ')} WHERE usuario_id = $${valores.length} RETURNING id`,
    valores,
  );
  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');

  return { id: fila.id };
};
