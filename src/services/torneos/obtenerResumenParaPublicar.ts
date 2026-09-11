import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-16/UC-18 — Datos para la pantalla "Listo para publicar" (Flujo 3
 * del paquete de diseño): la ciudad del torneo, y si la organización
 * ya está verificada — de eso depende la visibilidad que va a tener
 * (`publicarTorneo.ts`, D-51): verificada entra a `public` (aparece en
 * el descubrimiento); sin verificar entra a `unlisted` (accesible por
 * link, no por búsqueda) hasta que se verifique.
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerResumenParaPublicarInput = z.infer<typeof esquemaEntrada>;

export interface ResumenParaPublicar {
  torneoEstado: string;
  ciudadNombre: string;
  organizacionVerificada: boolean;
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
    nivel_verificacion: 'unverified' | 'basic' | 'trusted';
  }>(
    `SELECT t.estado, c.nombre AS ciudad_nombre, o.nivel_verificacion
     FROM torneo t
     JOIN ciudad c ON c.id = t.ciudad_id
     JOIN organizacion o ON o.id = t.organizacion_id
     WHERE t.id = $1`,
    [datos.torneoId],
  );
  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');

  return {
    torneoEstado: fila.estado,
    ciudadNombre: fila.ciudad_nombre,
    organizacionVerificada: fila.nivel_verificacion !== 'unverified',
  };
};
