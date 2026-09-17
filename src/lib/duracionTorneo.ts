/**
 * Duración del torneo — clasificación **derivada**, nunca guardada
 * (`04`, 5.4; `06`, D-99): se calcula a partir de `fecha_inicio_estimada`
 * y `fecha_fin_estimada`, sin columna ni bandera nueva. Una bandera que
 * pudiera contradecir a las fechas sería un estado de más — mismo
 * criterio con que el árbol de zonas no guarda sus ancestros (D-88).
 *
 * `null` cuando falta alguna de las dos fechas: aún no hay manera de
 * saber si el torneo es relámpago o extendido, así que no se lo
 * clasifica en vez de adivinar.
 */

export const VALORES_DURACION_TORNEO = ['single_day', 'weekend', 'extended'] as const;
export type DuracionTorneo = (typeof VALORES_DURACION_TORNEO)[number];

const ETIQUETAS: Record<DuracionTorneo, string> = {
  single_day: 'Un día',
  weekend: 'Fin de semana',
  extended: 'Liga extendida',
};

export function etiquetaDuracionTorneo(duracion: DuracionTorneo): string {
  return ETIQUETAS[duracion];
}

/**
 * `fechaInicioEstimada`/`fechaFinEstimada` en días calendario (UTC,
 * como vienen de la base): mismo día → `single_day`; ventana de 2 o 3
 * días → `weekend`; más de 3 días → `extended`.
 */
export function calcularDuracionTorneo(
  fechaInicioEstimada: string | Date | null,
  fechaFinEstimada: string | Date | null,
): DuracionTorneo | null {
  if (!fechaInicioEstimada || !fechaFinEstimada) return null;

  const inicio =
    typeof fechaInicioEstimada === 'string' ? new Date(fechaInicioEstimada) : fechaInicioEstimada;
  const fin = typeof fechaFinEstimada === 'string' ? new Date(fechaFinEstimada) : fechaFinEstimada;
  const inicioDia = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
  const finDia = Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate());
  const diffDias = Math.round((finDia - inicioDia) / (1000 * 60 * 60 * 24));

  if (diffDias <= 0) return 'single_day';
  if (diffDias <= 2) return 'weekend';
  return 'extended';
}

/** `06`, D-100/D-102: un torneo de 3 días o menos es "relámpago". */
export function esTorneoRelampago(duracion: DuracionTorneo | null): boolean {
  return duracion === 'single_day' || duracion === 'weekend';
}
