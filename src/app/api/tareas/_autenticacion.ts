import type { NextRequest } from 'next/server';
import { crearError } from '@/lib/errores';

/**
 * Las rutas de tareas programadas no llevan sesión de usuario — las
 * dispara `pg_cron` + `pg_net` desde Supabase (T28, `10` T-11), no una
 * persona — así que se protegen con un secreto compartido en vez de
 * `verificarPermiso*`. Sin esto, cualquiera en internet podría disparar
 * la confirmación masiva de resultados. `CRON_SECRET` es el nombre que
 * fija `pasos-infraestructura-T28.md`: es la variable que se carga en
 * Vercel y la que usa la tarea de Postgres al llamar por HTTP.
 *
 * Distingue las dos fallas a propósito. Antes las dos devolvían
 * `SIN_PERMISO`, y desde afuera eran indistinguibles: un 403 podía
 * significar "el valor que mandaste no coincide" o "acá no hay ningún
 * secreto cargado", que se arreglan en lugares distintos. Perseguir la
 * primera cuando el problema era la segunda cuesta horas, y el síntoma
 * —la tarea horaria devolviendo 403 en cada corrida— no dice cuál es.
 */
export function verificarSecretoDeTarea(request: NextRequest): void {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) throw crearError('SECRETO_DE_TAREA_NO_CONFIGURADO');

  const encabezado = request.headers.get('authorization');
  if (encabezado === `Bearer ${secreto}`) return;

  throw crearError('SIN_PERMISO', formaDeLaCabecera(encabezado, secreto));
}

/**
 * Describe la cabecera que llegó, sin su contenido. Todo lo que devuelve
 * es sobre lo que **mandó quien llama**, no sobre el secreto guardado:
 * quien hizo el pedido ya sabe qué mandó, así que esto no le revela nada
 * que no tuviera. El único dato que mira el secreto es un booleano de
 * comparación, que es lo mismo que ya informa el 403.
 *
 * Existe porque un cliente que no es un navegador —`pg_net` llamando
 * desde Postgres— no deja ver qué mandó: si la cabecera se pierde en el
 * camino, llega recortada o trae un salto de línea pegado, desde afuera
 * las tres se ven igual, como un 403 seco. Con esto, una sola llamada
 * dice cuál de las tres es.
 */
function formaDeLaCabecera(encabezado: string | null, secreto: string) {
  if (encabezado === null) return { llegoLaCabecera: false };

  const prefijo = 'Bearer ';
  const empiezaConBearer = encabezado.startsWith(prefijo);
  const valor = empiezaConBearer ? encabezado.slice(prefijo.length) : encabezado;

  return {
    llegoLaCabecera: true,
    empiezaConBearer,
    largoDelValor: valor.length,
    largoEsperado: secreto.length,
    coincideAlRecortarEspacios: valor.trim() === secreto,
  };
}
