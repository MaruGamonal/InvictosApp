import { crearError } from '@/lib/errores';
import type { PartidoPropuesto } from './_roundRobin';

/**
 * Eliminación directa: llaves según la cantidad de clasificados (`06`,
 * D-31b — sin criterios, el orden de entrada es el del sorteo/ranking
 * ya resuelto). Empareja 1º contra último, 2º contra anteúltimo, etc.
 *
 * **Límite del MVP, no cubierto por ninguna decisión del backlog:**
 * sin un mecanismo de bye documentado (`partido` exige los dos equipos,
 * no admite "libre"), esta función solo arma la primera ronda cuando la
 * cantidad de equipos es una potencia de 2. Con cualquier otra
 * cantidad, rechaza con `DATOS_INVALIDOS` en vez de producir una llave
 * rota — una organización real que necesite byes ajusta la cantidad de
 * clasificados por zona para llegar a una potencia de 2.
 */
export function generarPrimeraRondaBracket(equiposOrdenados: string[]): PartidoPropuesto[] {
  const n = equiposOrdenados.length;
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'equipos',
        problema:
          'La eliminación directa del MVP necesita una cantidad de equipos que sea potencia de 2 (2, 4, 8, 16...).',
      },
    ]);
  }

  const partidos: PartidoPropuesto[] = [];
  for (let i = 0; i < n / 2; i += 1) {
    partidos.push({
      numeroFecha: 1,
      equipoLocalId: equiposOrdenados[i]!,
      equipoVisitanteId: equiposOrdenados[n - 1 - i]!,
    });
  }
  return partidos;
}

/**
 * La ronda siguiente de un bracket ya iniciado: empareja a los
 * ganadores en el mismo orden en que llegaron (`06`, D-31b: las llaves
 * de la fase siguiente se generan al cerrar la anterior, con los
 * clasificados ya definidos — el mismo principio aplica ronda a ronda
 * dentro de la eliminatoria, porque el rival de octavos no existe hasta
 * que se juega la ronda anterior).
 */
export function generarSiguienteRondaBracket(
  ganadoresEnOrden: string[],
  numeroFechaSiguiente: number,
): PartidoPropuesto[] {
  const n = ganadoresEnOrden.length;
  if (n < 2 || n % 2 !== 0) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'equipos', problema: 'La cantidad de ganadores de la ronda anterior no es par.' },
    ]);
  }
  const partidos: PartidoPropuesto[] = [];
  for (let i = 0; i < n; i += 2) {
    partidos.push({
      numeroFecha: numeroFechaSiguiente,
      equipoLocalId: ganadoresEnOrden[i]!,
      equipoVisitanteId: ganadoresEnOrden[i + 1]!,
    });
  }
  return partidos;
}
