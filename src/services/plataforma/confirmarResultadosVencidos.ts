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
 *
 * **Por qué hay un tope y un reloj.** Esto corre en una función sin
 * servidor, que tiene un límite de tiempo de pared: si se pasa, la
 * plataforma la mata en el medio, sin dejar rastro. El bucle recorría
 * todos los partidos vencidos, uno por uno y cada uno con su
 * transacción, sin límite de ninguna clase. Mientras hubo pocos
 * resultados por hora anduvo; la primera vez que vencen muchos juntos
 * —una fecha entera cumple las 72 horas al mismo tiempo— la corrida se
 * estira y se corta. Eso es exactamente lo que Sentry reporta como
 * *timeout check-in*: el aviso de arranque llegó, el de fin nunca.
 *
 * Que el reintento sea seguro es justo lo que permite cortar a tiempo:
 * se procesa lo que entra en el presupuesto, se informa cuántos
 * quedaron y la corrida de la hora siguiente sigue por donde iba. Un
 * resultado se confirma una hora más tarde; antes, con la corrida
 * cortada, no se confirmaba ninguno y encima no se sabía.
 */

/** Tope por corrida: acota la memoria y el tamaño del lote. */
const MAXIMO_POR_CORRIDA = 200;

/**
 * Presupuesto de trabajo, bastante por debajo del límite de la función
 * (`maxDuration` en la ruta). El margen es para cerrar el check-in y
 * responder: cortar justo en el límite es lo mismo que no cortar.
 */
const MILISEGUNDOS_DE_PRESUPUESTO = 45_000;

export interface ResumenEjecucion {
  procesados: number;
  cambiados: number;
  fallidos: Array<{ partidoId: string; error: string }>;
  /**
   * Del lote que se trajo, cuántos quedaron sin procesar porque se
   * agotó el presupuesto. Es un número exacto.
   */
  pendientes: number;
  /**
   * La consulta llegó al tope, así que además de `pendientes` hay más
   * esperando que ni siquiera se trajeron. No se cuentan: saber
   * cuántos exactamente costaría otra consulta y no cambia qué hacer
   * —la corrida siguiente sigue igual—, pero que los haya sí importa.
   */
  puedeHaberMas: boolean;
}

export async function confirmarResultadosVencidos(): Promise<ResumenEjecucion> {
  const comenzoEn = Date.now();
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
       )
     ORDER BY p.fecha_carga_resultado ASC
     LIMIT $1`,
    // Uno más que el tope: si vuelve, es que hay más de los que entran
    // en este lote, y hay que decirlo sin una segunda consulta.
    [MAXIMO_POR_CORRIDA + 1],
  );

  const hayMasQueElLote = rows.length > MAXIMO_POR_CORRIDA;
  const delLote = hayMasQueElLote ? rows.slice(0, MAXIMO_POR_CORRIDA) : rows;

  const resumen: ResumenEjecucion = {
    procesados: 0,
    cambiados: 0,
    fallidos: [],
    pendientes: 0,
    puedeHaberMas: hayMasQueElLote,
  };
  const contexto = contextoDeSistema();

  for (const [indice, { id }] of delLote.entries()) {
    // Antes de empezar otro, no en el medio: cada confirmación es una
    // transacción y cortarla por la mitad sería peor que llegar tarde.
    if (Date.now() - comenzoEn > MILISEGUNDOS_DE_PRESUPUESTO) {
      resumen.pendientes = delLote.length - indice;
      break;
    }

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
