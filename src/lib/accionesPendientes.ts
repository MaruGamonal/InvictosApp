/**
 * Registro de "acciones pendientes" que un registro (UC-01) puede
 * completar en el mismo movimiento — por ejemplo, seguir el torneo desde
 * el que se disparó el alta (`10`, 4.1; `02`, UC-01).
 *
 * Este módulo es el mecanismo genérico, no el catálogo de acciones: cada
 * dominio registra la suya cuando su servicio existe. Hoy ninguna acción
 * concreta está registrada porque `seguir` (UC-42/43) es de T25 y
 * `solicitarInscripcion` (UC-24) es de T20 — ninguno de los dos existe
 * todavía. Cuando esos tickets se construyan, la ruta de "seguir sin
 * cuenta → registrarse → ya sigue" se completa con
 * `registrarAccionPendiente('seguir_torneo', ...)`, sin tocar `registrar`
 * ni este archivo.
 */

export interface AccionPendiente {
  tipo: string;
  datos: Record<string, unknown>;
}

type Ejecutor = (datos: Record<string, unknown>, usuarioId: string) => Promise<void>;

const ejecutores = new Map<string, Ejecutor>();

export function registrarAccionPendiente(tipo: string, ejecutor: Ejecutor): void {
  ejecutores.set(tipo, ejecutor);
}

/**
 * Ejecuta la acción pendiente de un registro recién completado. Un tipo
 * sin ejecutor registrado es un error de programación (una pantalla
 * ofreciendo una acción que ningún dominio implementó todavía), no una
 * entrada de usuario inválida — por eso no se traduce a `DATOS_INVALIDOS`.
 */
export async function ejecutarAccionPendiente(
  accion: AccionPendiente,
  usuarioId: string,
): Promise<void> {
  const ejecutor = ejecutores.get(accion.tipo);
  if (!ejecutor) {
    throw new Error(`No hay una acción pendiente registrada para el tipo "${accion.tipo}"`);
  }
  await ejecutor(accion.datos, usuarioId);
}

/** Solo para tests: limpia el registro entre casos. */
export function reiniciarAccionesPendientes(): void {
  ejecutores.clear();
}
