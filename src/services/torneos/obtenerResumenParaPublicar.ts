import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { CONFIGURACION } from '@/lib/configuracion';

/**
 * UC-16/UC-18 — Datos para la pantalla "Listo para publicar" (Flujo 3
 * del paquete de diseño): la ciudad del torneo, y si la organización
 * ya está verificada — de eso depende la visibilidad que va a tener
 * (`publicarTorneo.ts`, D-51): verificada entra a `public` (aparece en
 * el descubrimiento); sin verificar entra a `unlisted` (accesible por
 * link, no por búsqueda) hasta que se verifique.
 *
 * Devuelve además lo que hace falta para **ofrecer la verificación acá
 * mismo**, que es la otra mitad de D-51 (`05`, 5): quién es la
 * organización, si quien mira es el Titular —el único que puede pedirla
 * (`10`, 4.2)— y si el límite de torneos publicados sin verificar ya
 * está alcanzado.
 *
 * Ese último dato existe para poder avisar **antes** de tocar el botón.
 * `publicarTorneo` lo vuelve a comprobar y rechaza con
 * `LIMITE_TORNEOS_PUBLICADOS`: esto es lo que se muestra, no lo que
 * decide. Quien llame a la API directamente choca igual con la regla.
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerResumenParaPublicarInput = z.infer<typeof esquemaEntrada>;

export interface ResumenParaPublicar {
  torneoEstado: string;
  ciudadNombre: string;
  organizacionId: string;
  organizacionVerificada: boolean;
  /** Solo el Titular puede pedir la verificación básica (`10`, 4.2). */
  soyTitular: boolean;
  /**
   * Sin verificar, la organización puede tener un solo torneo publicado
   * a la vez (`06`, D-51). Si ya lo tiene, publicar este va a fallar.
   */
  limitePublicadosAlcanzado: boolean;
}

export const obtenerResumenParaPublicar: Servicio<
  ObtenerResumenParaPublicarInput,
  ResumenParaPublicar
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows } = await pool.query<{
    estado: string;
    ciudad_nombre: string;
    organizacion_id: string;
    nivel_verificacion: 'unverified' | 'basic' | 'trusted';
    usuario_titular_id: string;
    publicados: string;
  }>(
    `SELECT t.estado, c.nombre AS ciudad_nombre, o.id AS organizacion_id,
            o.nivel_verificacion, o.usuario_titular_id,
            (SELECT count(*) FROM torneo otro
              WHERE otro.organizacion_id = o.id
                AND otro.estado NOT IN ('draft', 'cancelled')
                AND otro.id != t.id) AS publicados
     FROM torneo t
     JOIN ciudad c ON c.id = t.ciudad_id
     JOIN organizacion o ON o.id = t.organizacion_id
     WHERE t.id = $1`,
    [datos.torneoId],
  );
  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');

  const organizacionVerificada = fila.nivel_verificacion !== 'unverified';

  return {
    torneoEstado: fila.estado,
    ciudadNombre: fila.ciudad_nombre,
    organizacionId: fila.organizacion_id,
    organizacionVerificada,
    soyTitular: fila.usuario_titular_id === contexto.usuarioId,
    limitePublicadosAlcanzado:
      !organizacionVerificada &&
      Number(fila.publicados) >= CONFIGURACION.limiteTorneosPublicadosSinVerificar,
  };
};
