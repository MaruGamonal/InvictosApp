import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { verificarCuentaConfirmada } from '@/lib/cuentaConfirmada';

/**
 * Punto de entrada de "Crear torneo" (Flujo 3 del paquete de diseño):
 * resuelve la organización bajo la que nace el torneo, porque
 * `crearTorneo` sí exige un `organizacionId` (`03`, 3.7).
 *
 * Antes la creaba sola cuando no había ninguna, con un nombre de
 * arranque ("Torneos de <nombre>"). Reportado en vivo: eso dejaba
 * organizaciones que nadie eligió tener, con un nombre que después había
 * que descubrir y corregir desde otra pantalla, y hacía invisible un
 * paso que el producto sí quiere explícito. Ahora falla con
 * `SIN_ORGANIZACION` y la pantalla de "Crear torneo" manda a crearla
 * antes de mostrar el formulario.
 *
 * "Propia" es deliberadamente la primera donde figura como Titular
 * (`owner`), no cualquiera donde sea Administrador: crear un torneo
 * nuevo debería caer bajo la organización que la persona misma fundó,
 * no bajo una a la que la invitaron a colaborar.
 *
 * Reportado en vivo: exige la cuenta confirmada
 * (`verificarCuentaConfirmada`) — se chequea acá, el verdadero punto de
 * entrada de "Crear torneo", para no crear una organización huérfana
 * si el paso de `crearTorneo` de después rechaza por esto.
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
  await verificarCuentaConfirmada(contexto);

  const pool = obtenerPool();
  const { rows } = await pool.query<{ organizacion_id: string }>(
    `SELECT organizacion_id FROM miembro_organizacion
     WHERE usuario_id = $1 AND rol = 'owner'
     ORDER BY organizacion_id LIMIT 1`,
    [contexto.usuarioId],
  );
  const existente = rows[0]?.organizacion_id;
  if (!existente) throw crearError('SIN_ORGANIZACION');

  return { organizacionId: existente, creada: false };
};
