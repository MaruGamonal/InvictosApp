import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPuedeVerTorneo } from '@/lib/permisos';

/**
 * UC-36 (`11`, T31) — Goleadores y tarjetas del torneo. No calcula nada
 * nuevo: lee `estadistica_jugador`, que `cargarResultado` (T30) acumula
 * al cargar cada resultado. **Público, sin sesión** (`06`, D-04b), mismo
 * criterio de visibilidad que la tabla de posiciones (`obtenerTablaTorneo`).
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerEstadisticasTorneoInput = z.infer<typeof esquemaEntrada>;

export interface GoleadorTorneo {
  perfilId: string;
  nombreVisible: string;
  equipoId: string;
  equipoNombre: string;
  equipoEscudoUrl: string | null;
  goles: number;
}

export interface TarjetaTorneo {
  perfilId: string;
  nombreVisible: string;
  equipoId: string;
  equipoNombre: string;
  equipoEscudoUrl: string | null;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
}

export interface EstadisticasTorneo {
  goleadores: GoleadorTorneo[];
  tarjetas: TarjetaTorneo[];
}

export const obtenerEstadisticasTorneo: Servicio<
  ObtenerEstadisticasTorneoInput,
  EstadisticasTorneo
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows: torneoRows } = await pool.query<{
    id: string;
    organizacion_id: string;
    estado: string;
  }>('SELECT id, organizacion_id, estado FROM torneo WHERE id = $1', [datos.torneoId]);
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');
  await verificarPuedeVerTorneo(contexto, {
    id: torneo.id,
    organizacionId: torneo.organizacion_id,
    estado: torneo.estado,
  });

  const { rows } = await pool.query<{
    perfil_id: string;
    nombre_visible: string;
    equipo_id: string;
    equipo_nombre: string;
    equipo_escudo_url: string | null;
    goles: number;
    tarjetas_amarillas: number;
    tarjetas_rojas: number;
  }>(
    `SELECT ej.perfil_id, pd.nombre_visible, ej.equipo_id, e.nombre AS equipo_nombre,
            e.escudo_url AS equipo_escudo_url, ej.goles, ej.tarjetas_amarillas, ej.tarjetas_rojas
     FROM estadistica_jugador ej
     JOIN perfil_deportivo pd ON pd.id = ej.perfil_id
     JOIN equipo e ON e.id = ej.equipo_id
     WHERE ej.torneo_id = $1 AND (ej.goles > 0 OR ej.tarjetas_amarillas > 0 OR ej.tarjetas_rojas > 0)`,
    [datos.torneoId],
  );

  const goleadores = rows
    .filter((fila) => fila.goles > 0)
    .map((fila) => ({
      perfilId: fila.perfil_id,
      nombreVisible: fila.nombre_visible,
      equipoId: fila.equipo_id,
      equipoNombre: fila.equipo_nombre,
      equipoEscudoUrl: fila.equipo_escudo_url,
      goles: fila.goles,
    }))
    .sort((a, b) => b.goles - a.goles || a.nombreVisible.localeCompare(b.nombreVisible));

  const tarjetas = rows
    .filter((fila) => fila.tarjetas_amarillas > 0 || fila.tarjetas_rojas > 0)
    .map((fila) => ({
      perfilId: fila.perfil_id,
      nombreVisible: fila.nombre_visible,
      equipoId: fila.equipo_id,
      equipoNombre: fila.equipo_nombre,
      equipoEscudoUrl: fila.equipo_escudo_url,
      tarjetasAmarillas: fila.tarjetas_amarillas,
      tarjetasRojas: fila.tarjetas_rojas,
    }))
    .sort(
      (a, b) =>
        b.tarjetasRojas - a.tarjetasRojas ||
        b.tarjetasAmarillas - a.tarjetasAmarillas ||
        a.nombreVisible.localeCompare(b.nombreVisible),
    );

  return { goleadores, tarjetas };
};
