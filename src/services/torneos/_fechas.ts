import { crearError } from '@/lib/errores';

/**
 * Un torneo no puede terminar antes de empezar. No estaba validado en
 * ningún lado: se podía guardar inicio 30/09 y fin 22/09, y con las dos
 * fechas cargadas la duración se usa para decidir si el torneo es
 * relámpago (`06`, D-99), así que una diferencia negativa no es solo un
 * dato feo — cambia cómo se calculan los plazos de confirmación.
 *
 * Se compara el par **efectivo**: al modificar un torneo puede venir una
 * sola de las dos fechas, y la que falta es la que ya está guardada.
 */
export function verificarOrdenDeFechas(
  inicio: string | Date | null | undefined,
  fin: string | Date | null | undefined,
): void {
  if (!inicio || !fin) return;

  if (new Date(fin).getTime() < new Date(inicio).getTime()) {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'fechaFinEstimada',
        problema: 'La fecha de fin no puede ser anterior a la de inicio.',
      },
    ]);
  }
}
