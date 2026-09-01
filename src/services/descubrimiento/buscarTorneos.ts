import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { paginar } from '@/lib/paginacion';

/**
 * UC-22 — Buscar y filtrar torneos: **el activo del producto** (`06`,
 * D-51). `ciudadId` no es un filtro más: es el contexto de la consulta
 * (`06`, D-90) — este servicio no lo resuelve por su cuenta (no hay
 * "ciudad de la persona" en la sesión ni se infiere de nada, D-89/D-90);
 * quien llama ya lo trae, desde el perfil o desde lo que la persona
 * eligió en pantalla.
 *
 * **Solo `visibilidad = 'public'`** (`06`, D-21b): un `unlisted` nunca
 * aparece acá, solo por su link directo. Un `cancelled` tampoco — nadie
 * busca dónde jugar un torneo que no va a jugarse. `draft` queda afuera
 * por construcción: `visibilidad` solo pasa a `public` en el mismo paso
 * que `publicarTorneo` saca al torneo de `draft` (T10).
 *
 * **Orden** (`06`, D-26b, D-51), de mayor a menor prioridad:
 * 1. Inscripciones abiertas primero.
 * 2. Fecha de inicio más cercana primero.
 * 3. A igualdad de fecha, organización verificada primero.
 *
 * Paginación por cursor (`10`, 2.7) con `paginar` (T5): la clave de
 * orden codifica los tres criterios más el id como desempate final, así
 * que un torneo nuevo insertado entre dos lecturas nunca repite ni
 * saltea filas de la página siguiente.
 */

const MODALIDADES = ['f5', 'f7', 'f8', 'f9', 'f11'] as const;
const CATEGORIAS_EDAD = ['open', 'u13', 'u15', 'u17', 'u20', 'veterans_35', 'veterans_45'] as const;
const ESTADOS_DESCUBRIBLES = [
  'registration_open',
  'registration_closed',
  'in_progress',
  'finished',
  'suspended',
];
const TAMANO_PAGINA_DEFECTO = 20;

const esquemaEntrada = z.object({
  ciudadId: z.string().uuid(),
  modalidad: z.enum(MODALIDADES).optional(),
  categoriaEdad: z.enum(CATEGORIAS_EDAD).optional(),
  soloInscripcionesAbiertas: z.boolean().optional(),
  fechaInicioDesde: z.string().datetime().optional(),
  cursor: z.string().optional(),
  tamanoPagina: z.number().int().positive().max(50).optional(),
});
export type BuscarTorneosInput = z.infer<typeof esquemaEntrada>;

export interface TorneoBuscado {
  id: string;
  nombre: string;
  imagenUrl: string | null;
  modalidad: string;
  categoriaEdad: string;
  estado: string;
  fechaInicioEstimada: string | null;
  organizacionVerificada: boolean;
}

export interface ResultadoBusquedaTorneos {
  torneos: TorneoBuscado[];
  cursorSiguiente: string | null;
  /** Presente solo cuando la ciudad no tiene torneos y esta es la primera página (`06`, D-89). */
  sugerenciaProvincia: { nombre: string; cantidadTorneos: number } | null;
}

interface FilaTorneo {
  id: string;
  nombre: string;
  organizacion_logo_url: string | null;
  modalidad: string;
  categoria_edad: string;
  estado: string;
  fecha_inicio_estimada: Date | null;
  organizacion_verificada: boolean;
}

export const buscarTorneos: Servicio<BuscarTorneosInput, ResultadoBusquedaTorneos> = async (
  input,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const tamanoPagina = datos.tamanoPagina ?? TAMANO_PAGINA_DEFECTO;
  const pool = obtenerPool();

  const condiciones = ['t.visibilidad = $1', 't.ciudad_id = $2', 't.estado = ANY($3)'];
  const valores: unknown[] = ['public', datos.ciudadId, ESTADOS_DESCUBRIBLES];
  if (datos.modalidad) {
    valores.push(datos.modalidad);
    condiciones.push(`t.modalidad = $${valores.length}`);
  }
  if (datos.categoriaEdad) {
    valores.push(datos.categoriaEdad);
    condiciones.push(`t.categoria_edad = $${valores.length}`);
  }
  if (datos.soloInscripcionesAbiertas) {
    condiciones.push(`t.estado = 'registration_open'`);
  }
  if (datos.fechaInicioDesde) {
    valores.push(datos.fechaInicioDesde);
    condiciones.push(`t.fecha_inicio_estimada >= $${valores.length}`);
  }

  const { rows } = await pool.query<FilaTorneo>(
    `SELECT t.id, t.nombre, o.logo_url AS organizacion_logo_url, t.modalidad, t.categoria_edad,
            t.estado, t.fecha_inicio_estimada, (o.nivel_verificacion != 'unverified') AS organizacion_verificada
     FROM torneo t
     JOIN organizacion o ON o.id = t.organizacion_id
     WHERE ${condiciones.join(' AND ')}
     ORDER BY
       (t.estado = 'registration_open') DESC,
       t.fecha_inicio_estimada ASC NULLS LAST,
       organizacion_verificada DESC,
       t.id ASC`,
    valores,
  );

  const { pagina, cursorSiguiente } = paginar(rows, {
    cursor: datos.cursor,
    tamanoPagina,
    obtenerClave: (fila) => [
      fila.estado === 'registration_open' ? 0 : 1,
      fila.fecha_inicio_estimada ? fila.fecha_inicio_estimada.getTime() : Number.MAX_SAFE_INTEGER,
      fila.organizacion_verificada ? 0 : 1,
      fila.id,
    ],
  });

  let sugerenciaProvincia: ResultadoBusquedaTorneos['sugerenciaProvincia'] = null;
  if (rows.length === 0 && !datos.cursor) {
    const { rows: provinciaRows } = await pool.query<{ nombre: string; cantidad: string }>(
      `SELECT p.nombre, count(t.id) AS cantidad
       FROM ciudad c
       JOIN provincia p ON p.id = c.provincia_id
       LEFT JOIN torneo t ON t.ciudad_id IN (SELECT id FROM ciudad WHERE provincia_id = p.id)
         AND t.visibilidad = 'public' AND t.estado = ANY($2)
       WHERE c.id = $1
       GROUP BY p.nombre`,
      [datos.ciudadId, ESTADOS_DESCUBRIBLES],
    );
    const provincia = provinciaRows[0];
    if (provincia) {
      sugerenciaProvincia = {
        nombre: provincia.nombre,
        cantidadTorneos: Number(provincia.cantidad),
      };
    }
  }

  return {
    torneos: pagina.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      imagenUrl: fila.organizacion_logo_url,
      modalidad: fila.modalidad,
      categoriaEdad: fila.categoria_edad,
      estado: fila.estado,
      fechaInicioEstimada: fila.fecha_inicio_estimada?.toISOString() ?? null,
      organizacionVerificada: fila.organizacion_verificada,
    })),
    cursorSiguiente,
    sugerenciaProvincia,
  };
};
