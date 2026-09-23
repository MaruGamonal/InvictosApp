import type { Servicio } from '@/lib/servicio';
import { crearError } from '@/lib/errores';
import { verificarCuentaConfirmada } from '@/lib/cuentaConfirmada';
import { resolverOrganizacionActiva } from './resolverOrganizacionActiva';

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
 * Resuelve **la organización activa**, la que la persona está
 * gestionando en el panel, y no "la primera donde es Titular" como
 * hacía antes. Dos razones: con varias organizaciones, crear un torneo
 * tiene que caer en la que se está mirando, no en otra; y un
 * Administrador invitado a una organización ajena sí puede crearle
 * torneos —`gestionar_torneos` lo habilita— así que excluirlo era un
 * bloqueo que el propio modelo de permisos no pedía.
 *
 * Con una sola organización no hay nada que elegir: es esa. Esa es la
 * preselección.
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

export interface AsegurarOrganizacionPropiaInput {
  /** La organización que se está gestionando en el panel, si hay una elegida. */
  organizacionIdPreferida?: string | undefined;
}

export const asegurarOrganizacionPropia: Servicio<
  AsegurarOrganizacionPropiaInput | void,
  AsegurarOrganizacionPropiaResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  await verificarCuentaConfirmada(contexto);

  const activa = await resolverOrganizacionActiva(
    { organizacionIdPreferida: input?.organizacionIdPreferida },
    contexto,
  );
  if (!activa) throw crearError('SIN_ORGANIZACION');

  return { organizacionId: activa.organizacionId, creada: false };
};
