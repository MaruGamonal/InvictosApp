import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { crearOrganizacion } from './crearOrganizacion';

/**
 * Punto de entrada de "Crear torneo" (Flujo 3 del paquete de diseño):
 * el prototipo arranca directo en el formulario del torneo, sin un paso
 * previo de "Crear organización" (ese es un flujo propio, D2). Como
 * `crearTorneo` sí exige un `organizacionId` (`03`, 3.7), acá se
 * resuelve solo: si la persona ya tiene una organización propia, la usa;
 * si no, la crea al toque —titular automático, igual que
 * `crearOrganizacion`— con un nombre de arranque que se puede cambiar
 * después desde el perfil del organizador.
 *
 * "Propia" es deliberadamente la primera donde figura como Titular
 * (`owner`), no cualquiera donde sea Administrador: crear un torneo
 * nuevo debería caer bajo la organización que la persona misma fundó,
 * no bajo una a la que la invitaron a colaborar.
 */

export interface AsegurarOrganizacionPropiaResultado {
  organizacionId: string;
  creada: boolean;
}

export const asegurarOrganizacionPropia: Servicio<
  void,
  AsegurarOrganizacionPropiaResultado
> = async (_input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ organizacion_id: string }>(
    `SELECT organizacion_id FROM miembro_organizacion
     WHERE usuario_id = $1 AND rol = 'owner'
     ORDER BY organizacion_id LIMIT 1`,
    [contexto.usuarioId],
  );
  const existente = rows[0]?.organizacion_id;
  if (existente) return { organizacionId: existente, creada: false };

  const { rows: perfilRows } = await pool.query<{ nombre_visible: string }>(
    `SELECT nombre_visible FROM perfil_deportivo WHERE usuario_id = $1`,
    [contexto.usuarioId],
  );
  const nombreVisible = perfilRows[0]?.nombre_visible ?? 'Organizador';

  const creada = await crearOrganizacion({ nombre: `Torneos de ${nombreVisible}` }, contexto);
  return { organizacionId: creada.id, creada: true };
};
