import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { validarEntrada } from '@/lib/validacion';
import { paginar } from '@/lib/paginacion';

/**
 * Buscar equipos (nav "Equipos"): a diferencia del Descubrimiento de
 * torneos (D-90, ciudad como contexto obligatorio), acá la ciudad es un
 * filtro más, no un paso previo obligado — un equipo es una entidad
 * permanente que cualquiera puede querer encontrar por nombre sin pasar
 * primero por elegir dónde juega.
 */

const MODALIDADES = ['f5', 'f7', 'f8', 'f9', 'f11'] as const;
const CATEGORIAS_GENERO = ['male', 'female', 'mixed'] as const;
const TAMANO_PAGINA_DEFECTO = 20;

const esquemaEntrada = z.object({
  texto: z.string().trim().min(1).optional(),
  ciudadId: z.string().uuid().optional(),
  modalidad: z.enum(MODALIDADES).optional(),
  categoriaGenero: z.enum(CATEGORIAS_GENERO).optional(),
  cursor: z.string().optional(),
  tamanoPagina: z.number().int().positive().max(50).optional(),
});
export type BuscarEquiposInput = z.infer<typeof esquemaEntrada>;

export interface EquipoBuscado {
  id: string;
  nombre: string;
  escudoUrl: string | null;
  categoriaGenero: string;
  modalidadHabitual: string | null;
  ciudad: string | null;
}

export interface ResultadoBusquedaEquipos {
  equipos: EquipoBuscado[];
  cursorSiguiente: string | null;
}

interface FilaEquipo {
  id: string;
  nombre: string;
  escudo_url: string | null;
  categoria_genero: string;
  modalidad_habitual: string | null;
  ciudad_nombre: string | null;
}

export const buscarEquipos: Servicio<BuscarEquiposInput, ResultadoBusquedaEquipos> = async (
  input,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const tamanoPagina = datos.tamanoPagina ?? TAMANO_PAGINA_DEFECTO;
  const pool = obtenerPool();

  const condiciones = [`e.estado = 'active'`];
  const valores: unknown[] = [];
  if (datos.texto) {
    valores.push(`%${datos.texto}%`);
    condiciones.push(`e.nombre ILIKE $${valores.length}`);
  }
  if (datos.ciudadId) {
    valores.push(datos.ciudadId);
    condiciones.push(`e.ciudad_id = $${valores.length}`);
  }
  if (datos.modalidad) {
    valores.push(datos.modalidad);
    condiciones.push(`e.modalidad_habitual = $${valores.length}`);
  }
  if (datos.categoriaGenero) {
    valores.push(datos.categoriaGenero);
    condiciones.push(`e.categoria_genero = $${valores.length}`);
  }

  const { rows } = await pool.query<FilaEquipo>(
    `SELECT e.id, e.nombre, e.escudo_url, e.categoria_genero, e.modalidad_habitual, c.nombre AS ciudad_nombre
     FROM equipo e
     LEFT JOIN ciudad c ON c.id = e.ciudad_id
     WHERE ${condiciones.join(' AND ')}
     ORDER BY e.nombre ASC, e.id ASC`,
    valores,
  );

  const { pagina, cursorSiguiente } = paginar(rows, {
    cursor: datos.cursor,
    tamanoPagina,
    obtenerClave: (fila) => [fila.nombre, fila.id],
  });

  return {
    equipos: pagina.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      escudoUrl: fila.escudo_url,
      categoriaGenero: fila.categoria_genero,
      modalidadHabitual: fila.modalidad_habitual,
      ciudad: fila.ciudad_nombre,
    })),
    cursorSiguiente,
  };
};
