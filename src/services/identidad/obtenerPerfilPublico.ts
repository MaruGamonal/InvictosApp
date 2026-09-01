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

export interface PerfilPublico {
  id: string;
  nombreVisible: string;
  equipos: Array<{ id: string; nombre: string; escudoUrl: string | null; categoriaGenero: string }>;
  fotoUrl: string | null;
  posicion: string | null;
  ciudadId: string | null;
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
    visibilidad: 'public' | 'restricted';
  }>(
    `SELECT id, usuario_id, nombre_visible, foto_url, posicion, ciudad_id, visibilidad
     FROM perfil_deportivo WHERE id = $1`,
    [datos.perfilId],
  );
  const perfil = rows[0];
  if (!perfil) throw crearError('NO_ENCONTRADO');

  const { rows: equipos } = await pool.query<{
    id: string;
    nombre: string;
    escudo_url: string | null;
    categoria_genero: string;
  }>(
    `SELECT e.id, e.nombre, e.escudo_url, e.categoria_genero
     FROM integrante_equipo ie
     JOIN equipo e ON e.id = ie.equipo_id
     WHERE ie.perfil_id = $1 AND ie.estado_vinculo = 'active'`,
    [datos.perfilId],
  );

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
    })),
    fotoUrl: mostrarCompleto ? perfil.foto_url : null,
    posicion: mostrarCompleto ? perfil.posicion : null,
    ciudadId: mostrarCompleto ? perfil.ciudad_id : null,
    visibilidad: perfil.visibilidad,
  };
};
