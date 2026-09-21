import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { verificarSecretoDeTarea } from '../../tareas/_autenticacion';
import { limpiarDemo } from '../../../../../scripts/demo/limpiar';
import { sembrarDemo } from '../../../../../scripts/demo/sembrar';
import { validarDemo } from '../../../../../scripts/demo/validar';

/**
 * Los tres pasos del dataset demo (limpiar / sembrar / validar) sin
 * terminal — pensado para cuando lo único a mano es el navegador y el
 * proyecto desplegado. Corriendo acá adentro hereda las variables de
 * Vercel, incluida `SUPABASE_SERVICE_ROLE_KEY`, que es lo que permite
 * crear las cuentas demo en Supabase Auth: desde una terminal local eso
 * solo funciona si esas variables también están en el entorno.
 *
 * Reusa `CRON_SECRET` (ya cargado para T26/T28) en el header
 * `Authorization`, con el mismo criterio que las tareas programadas: sin
 * sesión de por medio, protegido para que no cualquiera pueda tocar los
 * datos del entorno desplegado.
 *
 *   curl -X POST https://invicta.com.ar/api/admin/sembrar-demo \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"accion":"reset"}'
 *
 * Acciones: `limpiar`, `sembrar`, `validar` y `reset` (las tres en
 * orden). `reset` es lo que deja la base como recién sembrada.
 */
/** El reset completo genera torneos con fixture y resultados: el default de Vercel se queda corto. */
export const maxDuration = 300;

type Accion = 'limpiar' | 'sembrar' | 'validar' | 'reset';

export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    verificarSecretoDeTarea(request);
    const cuerpo = (await request.json().catch(() => ({}))) as { accion?: Accion };
    const accion: Accion = cuerpo.accion ?? 'reset';

    if (accion === 'limpiar' || accion === 'reset') await limpiarDemo();
    if (accion === 'sembrar' || accion === 'reset') await sembrarDemo();

    const fallas = accion === 'validar' || accion === 'reset' ? await validarDemo() : null;

    // El detalle, no solo el conteo: desde acá el `console.log` del
    // script queda en los logs del servidor, así que lo que vuelve en la
    // respuesta es lo único que ve quien disparó la corrida.
    return {
      accion,
      fallasDeValidacion: fallas === null ? null : fallas.length,
      fallas,
    };
  });
}
