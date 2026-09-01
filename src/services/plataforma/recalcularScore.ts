import type { ResumenEjecucion } from './confirmarResultadosVencidos';

/**
 * T26, `10` 6.3 — El recálculo del score queda **declarado y agendado**
 * (diario, y además ante cada resultado que pasa a `confirmed` o torneo
 * que pasa a `finished`) pero **sin fórmula todavía**: las ponderaciones
 * no se fijan sobre el papel, se calibran con datos reales (`06`, 5.4;
 * `07`, sección 5). Lo que este ticket garantiza es no perder el insumo
 * —ya resuelto en T2 y T15—, no calcular nada. Cuando la fórmula exista,
 * esta función es el único lugar que cambia; el punto de entrada
 * (agendado por T28) no se toca.
 */
export async function recalcularScore(): Promise<ResumenEjecucion> {
  const resumen: ResumenEjecucion = { procesados: 0, cambiados: 0, fallidos: [] };
  console.log(
    '[tarea:recalcularScore] sin fórmula todavía (`07`, sección 5) — no-op declarado por T26',
  );
  return resumen;
}
