import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';

/**
 * UC-03 — Perfil público de un jugador. Es una superficie pública (`10`,
 * sección 5): se sirve sin sesión.
 *
 * Un perfil `restricted` **oculta el perfil, nunca la participación**
 * (`02`, UC-04): siempre devuelve el nombre visible y los equipos. Lo que
 * oculta es foto, posición y ciudad. Las estadísticas del torneo jugado
 * (T31) son del torneo, no del perfil, y por eso ni siquiera pasan por
 * este filtro — viven en su propia superficie.
 */

const esquemaEntrada = z.object({ perfilId: z.string().uuid() });
export type ObtenerPerfilPublicoInput = z.infer<typeof esquemaEntrada>;

export interface EquipoDelPerfil {
  id: string;
  nombre: string;
  escudoUrl: string | null;
  categoriaGenero: string;
  rolEquipo: string;
  esActual: boolean;
  /** Fecha ISO de alta en el plantel, o `null` si no se registró. */
  temporadaInicio: string | null;
  /** Fecha ISO de baja, o `null` — sin baja y `esActual`, es el equipo de hoy. */
  temporadaFin: string | null;
}

export interface PerfilPublico {
  id: string;
  nombreVisible: string;
  equipos: EquipoDelPerfil[];
  fotoUrl: string | null;
  posicion: string | null;
  ciudadId: string | null;
  ciudadNombre: string | null;
  visibilidad: 'public' | 'restricted';
}

export const obtenerPerfilPublico: Servicio<ObtenerPerfilPublicoInput, PerfilPublico> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows } = await pool.query<{
    id: string;
    usuario_id: string | null;
    nombre_visible: string;
    foto_url: string | null;
    posicion: string | null;
    ciudad_id: string | null;
    ciudad_nombre: string | null;
    visibilidad: 'public' | 'restricted';
  }>(
    `SELECT p.id, p.usuario_id, p.nombre_visible, p.foto_url, p.posicion, p.ciudad_id,
            c.nombre AS ciudad_nombre, p.visibilidad
     FROM perfil_deportivo p
     LEFT JOIN ciudad c ON c.id = p.ciudad_id
     WHERE p.id = $1`,
    [datos.perfilId],
  );
  const perfil = rows[0];
  if (!perfil) throw crearError('NO_ENCONTRADO');

  // Un equipo puede tener más de una fila histórica (p. ej. jugadora y
  // luego capitana): `DISTINCT ON` se queda con el vínculo más reciente
  // por equipo — la lista muestra la trayectoria, no cada cambio de rol.
  const { rows: equipos } = await pool.query<{
    id: string;
    nombre: string;
    escudo_url: string | null;
    categoria_genero: string;
    rol_equipo: string;
    estado_vinculo: string;
    fecha_incorporacion: string | null;
    fecha_baja: string | null;
  }>(
    `SELECT DISTINCT ON (e.id)
            e.id, e.nombre, e.escudo_url, e.categoria_genero,
            ie.rol_equipo, ie.estado_vinculo, ie.fecha_incorporacion, ie.fecha_baja
     FROM integrante_equipo ie
     JOIN equipo e ON e.id = ie.equipo_id
     WHERE ie.perfil_id = $1 AND ie.estado_vinculo IN ('active', 'left')
     ORDER BY e.id, ie.fecha_incorporacion DESC NULLS LAST`,
    [datos.perfilId],
  );
  equipos.sort((a, b) => (b.fecha_incorporacion ?? '').localeCompare(a.fecha_incorporacion ?? ''));

  const esElPropioDueño = contexto.usuarioId !== null && contexto.usuarioId === perfil.usuario_id;
  const mostrarCompleto = perfil.visibilidad === 'public' || esElPropioDueño;

  return {
    id: perfil.id,
    nombreVisible: perfil.nombre_visible,
    equipos: equipos.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      escudoUrl: e.escudo_url,
      categoriaGenero: e.categoria_genero,
      rolEquipo: e.rol_equipo,
      esActual: e.estado_vinculo === 'active',
      temporadaInicio: e.fecha_incorporacion,
      temporadaFin: e.fecha_baja,
    })),
    fotoUrl: mostrarCompleto ? perfil.foto_url : null,
    posicion: mostrarCompleto ? perfil.posicion : null,
    ciudadId: mostrarCompleto ? perfil.ciudad_id : null,
    ciudadNombre: mostrarCompleto ? perfil.ciudad_nombre : null,
    visibilidad: perfil.visibilidad,
  };
};
