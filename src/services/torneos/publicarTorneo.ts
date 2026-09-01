import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { CONFIGURACION } from '@/lib/configuracion';
import { invalidarCacheTorneo } from '@/lib/cache';

/**
 * UC-18 — Publicar un torneo: `draft → registration_open`, sin estado
 * intermedio (`06`, D-58). Abre las inscripciones en el mismo paso.
 *
 * La verificación de la organización decide **visibilidad, no si se
 * puede publicar** (`06`, D-51): `basic`/`trusted` → `public`;
 * `unverified` → `unlisted` — accesible por link, no por búsqueda
 * (D-21b) — y la respuesta indica el motivo para que la interfaz lo
 * explique y ofrezca verificar ahí mismo. Solo se rechaza con
 * `ORGANIZACION_NO_VERIFICADA` si alguien intenta **forzar** `public`
 * sin verificación.
 */

const esquemaEntrada = z.object({
  torneoId: z.string().uuid(),
  visibilidadDeseada: z.literal('public').optional(),
});
export type PublicarTorneoInput = z.infer<typeof esquemaEntrada>;

export interface PublicarTorneoResultado {
  id: string;
  estado: 'registration_open';
  visibilidad: 'public' | 'unlisted';
  motivoNoListado: 'organizacion_no_verificada' | null;
}

const CAMPOS_MINIMOS: Array<[string, string]> = [
  ['nombre', 'nombre'],
  ['modalidad', 'modalidad'],
  ['formato', 'formato'],
  ['ciudad_id', 'ciudad'],
  ['direccion', 'dirección'],
  ['fecha_inicio_estimada', 'fecha estimada de inicio'],
  ['cupo_equipos', 'cupo de equipos'],
];

export const publicarTorneo: Servicio<PublicarTorneoInput, PublicarTorneoResultado> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows } = await pool.query<
    Record<string, unknown> & { estado: string; organizacion_id: string }
  >(
    `SELECT nombre, modalidad, formato, ciudad_id, direccion, fecha_inicio_estimada, cupo_equipos,
            estado, organizacion_id
     FROM torneo WHERE id = $1`,
    [datos.torneoId],
  );
  const torneo = rows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');
  if (torneo.estado !== 'draft') throw crearError('TRANSICION_NO_PERMITIDA');

  const faltantes = CAMPOS_MINIMOS.filter(([columna]) => torneo[columna] === null).map(
    ([, etiqueta]) => ({ campo: etiqueta, problema: 'Falta para poder publicar el torneo.' }),
  );
  if (faltantes.length > 0) throw crearError('DATOS_MINIMOS_INCOMPLETOS', faltantes);

  const { rows: orgRows } = await pool.query<{
    nivel_verificacion: 'unverified' | 'basic' | 'trusted';
  }>('SELECT nivel_verificacion FROM organizacion WHERE id = $1', [torneo.organizacion_id]);
  const nivelVerificacion = orgRows[0]!.nivel_verificacion;
  const estaVerificada = nivelVerificacion !== 'unverified';

  if (datos.visibilidadDeseada === 'public' && !estaVerificada) {
    throw crearError('ORGANIZACION_NO_VERIFICADA');
  }

  if (!estaVerificada) {
    const { rows: publicados } = await pool.query(
      `SELECT count(*) FROM torneo
       WHERE organizacion_id = $1 AND estado NOT IN ('draft', 'cancelled') AND id != $2`,
      [torneo.organizacion_id, datos.torneoId],
    );
    if (Number(publicados[0]!.count) >= CONFIGURACION.limiteTorneosPublicadosSinVerificar) {
      throw crearError('LIMITE_TORNEOS_PUBLICADOS');
    }
  }

  const visibilidad: 'public' | 'unlisted' = estaVerificada ? 'public' : 'unlisted';

  await pool.query(
    `UPDATE torneo SET estado = 'registration_open', visibilidad = $1, fecha_publicacion = now(), version = version + 1
     WHERE id = $2`,
    [visibilidad, datos.torneoId],
  );

  invalidarCacheTorneo(datos.torneoId);

  return {
    id: datos.torneoId,
    estado: 'registration_open',
    visibilidad,
    motivoNoListado: estaVerificada ? null : 'organizacion_no_verificada',
  };
};
