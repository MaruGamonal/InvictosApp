import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-08 — Perfil público del organizador (`10`, sección 5): lo que un
 * capitán mira antes de confiarle su equipo a alguien que no conoce.
 *
 * **Todo torneo publicado** (override explícito de `06`, D-03b, pedido
 * en vivo): con inscripciones abiertas, en curso o finalizado — nunca
 * `draft` (no publicado) ni `cancelled` (en el MVP, sin volumen
 * todavía, una cancelación se leería como una condena pública en vez de
 * en contexto). Orden de prioridad: primero con inscripciones abiertas
 * (lo más accionable para quien mira), después en curso, y al final lo
 * finalizado. El distintivo `trusted` se muestra si existe aunque en el
 * MVP no se otorgue: el campo ya está listo para cuando exista.
 *
 * Una organización `inactive` no tiene perfil público — mismo criterio
 * que un torneo `draft`: `NO_ENCONTRADO`, no un perfil vacío.
 */

const esquemaEntrada = z.object({ organizacionId: z.string().uuid() });
export type ObtenerPerfilOrganizadorInput = z.infer<typeof esquemaEntrada>;

export interface TorneoDeTrayectoria {
  id: string;
  nombre: string;
  modalidad: string;
  categoriaEdad: string;
  estado: 'registration_open' | 'in_progress' | 'finished';
  fechaInicioEstimada: string | null;
  fechaFinEstimada: string | null;
}

export interface PerfilOrganizador {
  id: string;
  nombre: string;
  descripcion: string | null;
  logoUrl: string | null;
  ciudad: { id: string; nombre: string } | null;
  nivelVerificacion: 'unverified' | 'basic' | 'trusted';
  fechaAlta: string;
  trayectoria: TorneoDeTrayectoria[];
}

export const obtenerPerfilOrganizador: Servicio<
  ObtenerPerfilOrganizadorInput,
  PerfilOrganizador
> = async (input) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows } = await pool.query<{
    id: string;
    nombre: string;
    descripcion: string | null;
    logo_url: string | null;
    ciudad_id: string | null;
    ciudad_nombre: string | null;
    nivel_verificacion: 'unverified' | 'basic' | 'trusted';
    fecha_alta: Date;
    estado: 'active' | 'inactive';
  }>(
    `SELECT o.id, o.nombre, o.descripcion, o.logo_url, c.id AS ciudad_id, c.nombre AS ciudad_nombre,
            o.nivel_verificacion, o.fecha_alta, o.estado
     FROM organizacion o
     LEFT JOIN ciudad c ON c.id = o.ciudad_id
     WHERE o.id = $1`,
    [datos.organizacionId],
  );
  const organizacion = rows[0];
  if (!organizacion || organizacion.estado !== 'active') throw crearError('NO_ENCONTRADO');

  const { rows: torneos } = await pool.query<{
    id: string;
    nombre: string;
    modalidad: string;
    categoria_edad: string;
    estado: 'registration_open' | 'in_progress' | 'finished';
    fecha_inicio_estimada: Date | null;
    fecha_fin_estimada: Date | null;
  }>(
    `SELECT id, nombre, modalidad, categoria_edad, estado, fecha_inicio_estimada, fecha_fin_estimada
     FROM torneo
     WHERE organizacion_id = $1 AND estado IN ('registration_open', 'in_progress', 'finished')
     ORDER BY CASE estado
                WHEN 'registration_open' THEN 0
                WHEN 'in_progress' THEN 1
                ELSE 2
              END,
              fecha_fin_estimada DESC NULLS LAST,
              fecha_inicio_estimada DESC NULLS LAST`,
    [datos.organizacionId],
  );

  return {
    id: organizacion.id,
    nombre: organizacion.nombre,
    descripcion: organizacion.descripcion,
    logoUrl: organizacion.logo_url,
    ciudad: organizacion.ciudad_id
      ? { id: organizacion.ciudad_id, nombre: organizacion.ciudad_nombre! }
      : null,
    nivelVerificacion: organizacion.nivel_verificacion,
    fechaAlta: organizacion.fecha_alta.toISOString(),
    trayectoria: torneos.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      modalidad: t.modalidad,
      categoriaEdad: t.categoria_edad,
      estado: t.estado,
      fechaInicioEstimada: t.fecha_inicio_estimada?.toISOString() ?? null,
      fechaFinEstimada: t.fecha_fin_estimada?.toISOString() ?? null,
    })),
  };
};
