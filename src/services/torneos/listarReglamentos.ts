import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPuedeVerTorneo } from '@/lib/permisos';

/**
 * UC-51 — Consultar el reglamento vigente y el historial de versiones
 * anteriores, con su fecha de publicación y quién la publicó. Un
 * torneo en `draft` sigue las mismas reglas de visibilidad que el
 * torneo mismo (`10`, 2.3): solo lo ve quien administra su
 * organización o es su colaborador.
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ListarReglamentosInput = z.infer<typeof esquemaEntrada>;

export interface ReglamentoListado {
  numeroVersion: number;
  texto: string | null;
  archivoUrl: string | null;
  estado: 'current' | 'superseded';
  fechaPublicacion: string;
  publicadoPor: string;
}

export const listarReglamentos: Servicio<ListarReglamentosInput, ReglamentoListado[]> = async (
  input,
  contexto,
) => {
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
    numero_version: number;
    texto: string | null;
    archivo_url: string | null;
    estado: 'current' | 'superseded';
    fecha_publicacion: Date;
    publicado_por: string;
  }>(
    `SELECT r.numero_version, r.texto, r.archivo_url, r.estado, r.fecha_publicacion, u.nombre_completo AS publicado_por
     FROM reglamento r
     JOIN usuario u ON u.id = r.publicado_por_usuario_id
     WHERE r.torneo_id = $1
     ORDER BY r.numero_version DESC`,
    [datos.torneoId],
  );

  return rows.map((fila) => ({
    numeroVersion: fila.numero_version,
    texto: fila.texto,
    archivoUrl: fila.archivo_url,
    estado: fila.estado,
    fechaPublicacion: fila.fecha_publicacion.toISOString(),
    publicadoPor: fila.publicado_por,
  }));
};
