import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { listarOrganizacionesVinculadas } from '@/lib/permisos';

/**
 * Todas las organizaciones que una persona administra — propias y
 * ajenas donde fue sumada como Administradora.
 *
 * `resolverOrganizacionActiva` devuelve **una**: la primera de la lista.
 * Eso alcanzaba mientras el panel asumía una sola organización por
 * cuenta, pero esa suposición nunca fue cierta —el esquema admite
 * varias desde el principio— así que quien tuviera dos veía una y no
 * tenía forma de llegar a la otra.
 *
 * Los vínculos los resuelve `listarOrganizacionesVinculadas`
 * (`@/lib/permisos`), como corresponde: acá solo se leen los datos de
 * las organizaciones que esa función ya autorizó.
 *
 * Trae lo que hace falta para elegir entre ellas sin entrar: el estado
 * de verificación y cuántos torneos tiene cada una.
 */

export interface OrganizacionListada {
  organizacionId: string;
  nombre: string;
  logoUrl: string | null;
  rol: 'owner' | 'admin';
  nivelVerificacion: 'unverified' | 'basic' | 'trusted';
  /** Torneos que no están cancelados: los que la organización sostiene hoy. */
  cantidadTorneos: number;
}

interface Fila {
  id: string;
  nombre: string;
  logo_url: string | null;
  nivel_verificacion: 'unverified' | 'basic' | 'trusted';
  cantidad_torneos: string;
}

export const listarMisOrganizaciones: Servicio<void, OrganizacionListada[]> = async (
  _input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const vinculadas = await listarOrganizacionesVinculadas(contexto.usuarioId);
  if (vinculadas.length === 0) return [];

  const rolPorId = new Map(vinculadas.map((v) => [v.organizacionId, v.rol]));
  const pool = obtenerPool();
  const { rows } = await pool.query<Fila>(
    `SELECT o.id, o.nombre, o.logo_url, o.nivel_verificacion,
            count(t.id) FILTER (WHERE t.estado != 'cancelled') AS cantidad_torneos
     FROM organizacion o
     LEFT JOIN torneo t ON t.organizacion_id = o.id
     WHERE o.id = ANY($1::uuid[])
     GROUP BY o.id`,
    [vinculadas.map((v) => v.organizacionId)],
  );

  // El orden lo fija `listarOrganizacionesVinculadas` (propias primero):
  // la consulta agrupa y no lo conserva, así que se reordena acá.
  const porId = new Map(rows.map((fila) => [fila.id, fila]));
  return vinculadas.flatMap((vinculada) => {
    const fila = porId.get(vinculada.organizacionId);
    if (!fila) return [];
    return [
      {
        organizacionId: fila.id,
        nombre: fila.nombre,
        logoUrl: fila.logo_url,
        rol: rolPorId.get(fila.id) ?? vinculada.rol,
        nivelVerificacion: fila.nivel_verificacion,
        cantidadTorneos: Number(fila.cantidad_torneos),
      },
    ];
  });
};
