import * as Sentry from '@sentry/nextjs';
import { obtenerPool } from '@/db/cliente';
import { MAXIMO_INTENTOS, despacharFilas, type FilaParaDespachar } from './_despachoDeCorreo';
import type { TipoNotificacion } from './tipos';

/**
 * La mitad diferida del despacho híbrido: recoge los correos que el
 * envío inmediato de `notificar()` no logró mandar — proveedor caído,
 * red cortada, variable de entorno que todavía no estaba cargada.
 *
 * **Con lote y presupuesto de tiempo desde el primer día.** La tarea de
 * confirmación de resultados nació sin eso y se cortó en producción a
 * mitad de camino sin que nada lo señalara: recorría una tabla que
 * crece contra una función que tiene tiempo máximo. Acá el mismo patrón
 * ya está puesto, y el resumen dice exactamente cuántas quedaron.
 *
 * **No reintenta para siempre.** Dos topes, y cada uno tapa un agujero
 * distinto: `MAXIMO_INTENTOS` frena lo que falla por su culpa (una
 * casilla que no existe), y `DIAS_DE_VIGENCIA` frena lo que ya no tiene
 * sentido mandar — a nadie le sirve enterarse el jueves de que le
 * cambiaron el horario del partido del domingo pasado.
 */

const MAXIMO_POR_CORRIDA = 200;
const MILISEGUNDOS_DE_PRESUPUESTO = 45_000;
/** Un aviso más viejo que esto ya no se manda: llegó tarde y molesta. */
const DIAS_DE_VIGENCIA = 7;

export interface ResumenDespachoPendientes {
  enviados: number;
  fallidos: number;
  omitidos: number;
  /** Las que quedaron sin intentar en esta corrida, exactas. */
  pendientes: number;
  /** `true` si la consulta se llenó: puede haber más allá del lote. */
  puedeHaberMas: boolean;
}

interface Fila {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  entidad_origen_tipo: string | null;
  entidad_origen_id: string | null;
}

export async function despacharCorreosPendientes(): Promise<ResumenDespachoPendientes> {
  const comenzoEn = Date.now();
  const pool = obtenerPool();

  const { rows } = await pool.query<Fila>(
    `SELECT id, usuario_id, tipo, entidad_origen_tipo, entidad_origen_id
     FROM notificacion
     WHERE canal = 'email'
       AND estado IN ('pending', 'failed')
       AND intentos < $2
       AND fecha_generacion > now() - ($3 || ' days')::interval
     ORDER BY fecha_generacion ASC
     LIMIT $1`,
    [MAXIMO_POR_CORRIDA + 1, MAXIMO_INTENTOS, String(DIAS_DE_VIGENCIA)],
  );

  const puedeHaberMas = rows.length > MAXIMO_POR_CORRIDA;
  const delLote = rows.slice(0, MAXIMO_POR_CORRIDA);

  const resumen: ResumenDespachoPendientes = {
    enviados: 0,
    fallidos: 0,
    omitidos: 0,
    pendientes: 0,
    puedeHaberMas,
  };

  // De a diez y no todo junto: cada tanda consulta y actualiza la base,
  // y así el presupuesto de tiempo se puede mirar seguido sin cortar en
  // la mitad de un envío.
  const TAMANO_TANDA = 10;
  for (let desde = 0; desde < delLote.length; desde += TAMANO_TANDA) {
    if (Date.now() - comenzoEn > MILISEGUNDOS_DE_PRESUPUESTO) {
      resumen.pendientes = delLote.length - desde;
      break;
    }

    const tanda: FilaParaDespachar[] = delLote.slice(desde, desde + TAMANO_TANDA).map((fila) => ({
      id: fila.id,
      usuarioId: fila.usuario_id,
      tipo: fila.tipo,
      entidadOrigenTipo: fila.entidad_origen_tipo,
      entidadOrigenId: fila.entidad_origen_id,
    }));

    const parcial = await despacharFilas(pool, tanda);
    resumen.enviados += parcial.enviados;
    resumen.fallidos += parcial.fallidos;
    resumen.omitidos += parcial.omitidos;
  }

  console.log('[tarea:despacharCorreosPendientes]', JSON.stringify(resumen));

  // Que la corrida "termine bien" habiendo mandado cero y fallado
  // doscientos no es terminar bien: sin esto, un proveedor caído es
  // invisible hasta que alguien pregunta por qué no le llegan los
  // avisos.
  if (resumen.fallidos > 0) {
    Sentry.captureMessage(
      `Despacho de correos: ${resumen.fallidos} fallidos de ${resumen.fallidos + resumen.enviados}`,
      'warning',
    );
  }

  return resumen;
}
