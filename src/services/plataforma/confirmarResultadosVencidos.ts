import { obtenerPool } from '@/db/cliente';
import { contextoDeSistema } from '@/lib/contexto';
import { esErrorDeAplicacion } from '@/lib/errores';
import { confirmarResultado } from '@/services/competencia/confirmarResultado';

/**
 * T26, `10` 6.1 — Corre cada hora. Confirma todo partido `loaded`
 * cargado hace más de 72 horas y sin disputa abierta (`06`, D-60: una
 * disputa congela el plazo), delegando la confirmación en sí a
 * `confirmarResultado` — el mismo servicio que va a usar la
 * confirmación manual de T29, con contexto de sistema.
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
     WHERE p.estado_resultado = 'loaded'
       AND p.fecha_carga_resultado < now() - interval '72 hours'
       AND NOT EXISTS (
         SELECT 1 FROM disputa_resultado d WHERE d.partido_id = p.id AND d.estado = 'open'
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
