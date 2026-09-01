import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';

/**
 * El selector de ciudad (`06`, D-88, `11` T22): catálogo nacional
 * completo desde el día uno, agrupado en dos niveles y solo dos —
 * provincia → ciudad, sin barrios ni zonas intermedias — con las
 * ciudades que **tienen torneos primero** dentro de cada provincia.
 * Nadie se queda sin la suya: lo único que este orden decide es cuáles
 * se ofrecen antes.
 *
 * Mismo criterio de descubribilidad que `buscarTorneos`: cuenta
 * `visibilidad = 'public'` y los estados no cancelados/borrador.
 */

const ESTADOS_DESCUBRIBLES = [
  'registration_open',
  'registration_closed',
  'in_progress',
  'finished',
  'suspended',
];

const esquemaEntrada = z.object({ busqueda: z.string().trim().min(1).optional() });
export type ListarCiudadesInput = z.infer<typeof esquemaEntrada>;

export interface CiudadListada {
  id: string;
  nombre: string;
  cantidadTorneos: number;
}

export interface ProvinciaListada {
  id: string;
  nombre: string;
  ciudades: CiudadListada[];
}

interface FilaCiudad {
  provincia_id: string;
  provincia_nombre: string;
  ciudad_id: string;
  ciudad_nombre: string;
  cantidad_torneos: string;
}

export const listarCiudades: Servicio<ListarCiudadesInput, ProvinciaListada[]> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const valores: unknown[] = [ESTADOS_DESCUBRIBLES];
  let condicionBusqueda = '';
  if (datos.busqueda) {
    valores.push(`%${datos.busqueda}%`);
    condicionBusqueda = `AND c.nombre ILIKE $${valores.length}`;
  }

  const { rows } = await pool.query<FilaCiudad>(
    `SELECT p.id AS provincia_id, p.nombre AS provincia_nombre,
            c.id AS ciudad_id, c.nombre AS ciudad_nombre,
            count(t.id) FILTER (WHERE t.id IS NOT NULL) AS cantidad_torneos
     FROM ciudad c
     JOIN provincia p ON p.id = c.provincia_id
     LEFT JOIN torneo t ON t.ciudad_id = c.id AND t.visibilidad = 'public' AND t.estado = ANY($1)
     WHERE c.estado = 'active' ${condicionBusqueda}
     GROUP BY p.id, p.nombre, c.id, c.nombre
     ORDER BY p.nombre ASC, cantidad_torneos DESC, c.nombre ASC`,
    valores,
  );

  const provincias = new Map<string, ProvinciaListada>();
  for (const fila of rows) {
    if (!provincias.has(fila.provincia_id)) {
      provincias.set(fila.provincia_id, {
        id: fila.provincia_id,
        nombre: fila.provincia_nombre,
        ciudades: [],
      });
    }
    provincias.get(fila.provincia_id)!.ciudades.push({
      id: fila.ciudad_id,
      nombre: fila.ciudad_nombre,
      cantidadTorneos: Number(fila.cantidad_torneos),
    });
  }
  return [...provincias.values()];
};
