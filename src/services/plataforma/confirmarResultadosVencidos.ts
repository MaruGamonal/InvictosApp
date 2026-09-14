import { obtenerPool } from '@/db/cliente';
import { contextoDeSistema } from '@/lib/contexto';
import { esErrorDeAplicacion } from '@/lib/errores';
import { confirmarResultado } from '@/services/competencia/confirmarResultado';

/**
 * T26, `10` 6.1 — Corre cada hora. Confirma todo partido `loaded` sin
 * disputa abierta (`06`, D-60: una disputa congela el plazo) que
 * cumpla el plazo que le toca, delegando la confirmación en sí a
 * `confirmarResultado` — el mismo servicio que va a usar la
 * confirmación manual de T29, con contexto de sistema.
 *
 * **`06`, D-100:** el plazo no siempre son 72 horas desde la carga. En
 * un torneo relámpago (`fecha_fin - fecha_inicio` ≤ 3 días, `04` 5.4)
 * ya `finished`, el plazo se cierra al terminar el torneo — un plazo
 * que sobrevive al campeonato deja la definición abierta días después
 * de la premiación. En cualquier otro caso sigue siendo D-60: 72 horas
 * desde `fecha_carga_resultado`.
 *
 * El `WHERE estado_resultado = 'loaded'` se apoya en el índice
 * `partido (estado_resultado, fecha_carga_resultado)` de T2, así que no
 * recorre toda la tabla.
 *
 * **Reintento seguro:** correr esto dos veces sobre el mismo registro no
 * cambia el resultado — la segunda vez, ese partido ya no está en
 * `loaded`, así que ni siquiera entra al WHERE.
 */

export interface ResumenEjecucion {
  procesados: number;
  cambiados: number;
  fallidos: Array<{ partidoId: string; error: string }>;
}

export async function confirmarResultadosVencidos(): Promise<ResumenEjecucion> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string }>(
    `SELECT p.id
     FROM partido p
     JOIN torneo t ON t.id = p.torneo_id
     WHERE p.estado_resultado = 'loaded'
       AND NOT EXISTS (
         SELECT 1 FROM disputa_resultado d WHERE d.partido_id = p.id AND d.estado = 'open'
       )
       AND (
         p.fecha_carga_resultado < now() - interval '72 hours'
         OR (
           t.estado = 'finished'
           AND t.fecha_inicio_estimada IS NOT NULL AND t.fecha_fin_estimada IS NOT NULL
           AND (t.fecha_fin_estimada::date - t.fecha_inicio_estimada::date) <= 2
         )
       )`,
  );

  const resumen: ResumenEjecucion = { procesados: 0, cambiados: 0, fallidos: [] };
  const contexto = contextoDeSistema();

  for (const { id } of rows) {
    resumen.procesados += 1;
    try {
      await confirmarResultado({ partidoId: id }, contexto);
      resumen.cambiados += 1;
    } catch (error) {
      resumen.fallidos.push({
        partidoId: id,
        error: esErrorDeAplicacion(error) ? error.codigo : 'ERROR_INTERNO',
      });
    }
  }

  console.log('[tarea:confirmarResultadosVencidos]', JSON.stringify(resumen));
  return resumen;
}
