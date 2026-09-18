import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-16 (paso 5) — Abrir otra categoría competitiva del mismo evento
 * (`06`, D-103 a D-106): crea el Certamen si el torneo de origen todavía
 * no tenía uno —**y en ese caso también etiqueta al torneo de origen**,
 * porque el esquema exige `certamen_id` y `division` juntos o
 * ninguno— y **copia** el torneo de origen a uno nuevo, en `draft`.
 *
 * Es una copia, no una referencia (`06`, D-105): después de este
 * servicio ningún otro servicio sabe que la división existe, lee un
 * torneo normal. Por eso no pide "campos a pisar" en la creación —si
 * algo tiene que diferir (la C juega sábados, la A domingos), se edita
 * después con `actualizarTorneo`, que ya existe y ya cubre cualquier
 * campo.
 *
 * No copia fases ni grupos: cada división define su propio formato con
 * `definirFormato`, igual que un torneo recién creado (`06`, D-106, "no
 * hay servicios de certamen" — tampoco hay un formato de certamen).
 * Tampoco copia inscripciones, partidos, posiciones ni
 * `fecha_publicacion`.
 */

const esquemaEntrada = z.object({
  torneoIdOrigen: z.string().uuid(),
  /** Etiqueta de la división nueva — "B", "Oro", lo que use el organizador (`06`, D-104). */
  division: z.string().trim().min(1),
  /** Solo la primera vez que se abre una división de este torneo. */
  nombreCertamen: z.string().trim().min(1).optional(),
  /** Etiqueta que le queda al torneo de origen — solo la primera vez. */
  divisionOrigen: z.string().trim().min(1).optional(),
});
export type AgregarDivisionInput = z.infer<typeof esquemaEntrada>;

export interface AgregarDivisionResultado {
  id: string;
  certamenId: string;
  division: string;
}

const COLUMNAS_COPIADAS = [
  'nombre',
  'descripcion',
  'modalidad',
  'categoria_genero',
  'categoria_edad',
  'ciudad_id',
  'direccion',
  'latitud',
  'longitud',
  'imagen_url',
  'visibilidad',
  'formato',
  'cupo_equipos',
  'min_jugadores_lista',
  'max_jugadores_lista',
  'puntos_victoria',
  'puntos_empate',
  'puntos_derrota',
  'criterios_desempate',
  'costo_inscripcion',
  'costo_planilla',
  'fecha_inicio_estimada',
  'fecha_fin_estimada',
  'jugador_unico_por_equipo',
  'solo_organizador_carga_resultados',
  'partidos_pendientes_por_abandono',
  'goles_walkover_ganador',
  'goles_walkover_perdedor',
  'fecha_cierre_lista_buena_fe',
] as const;

export const agregarDivision: Servicio<AgregarDivisionInput, AgregarDivisionResultado> = async (
  input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoIdOrigen, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows: origenRows } = await pool.query<{
    organizacion_id: string;
    certamen_id: string | null;
  }>('SELECT organizacion_id, certamen_id FROM torneo WHERE id = $1', [datos.torneoIdOrigen]);
  const origen = origenRows[0];
  if (!origen) throw crearError('NO_ENCONTRADO');

  if (!origen.certamen_id && (!datos.nombreCertamen || !datos.divisionOrigen)) {
    throw crearError('DATOS_INVALIDOS', [
      {
        campo: 'nombreCertamen',
        problema:
          'Este torneo todavía no tiene divisiones — hace falta el nombre del evento y la etiqueta que le queda a este torneo.',
      },
    ]);
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    let certamenId = origen.certamen_id;
    if (!certamenId) {
      const { rows: certamenRows } = await cliente.query<{ id: string }>(
        'INSERT INTO certamen (organizacion_id, nombre) VALUES ($1, $2) RETURNING id',
        [origen.organizacion_id, datos.nombreCertamen],
      );
      certamenId = certamenRows[0]!.id;
      await cliente.query('UPDATE torneo SET certamen_id = $1, division = $2 WHERE id = $3', [
        certamenId,
        datos.divisionOrigen,
        datos.torneoIdOrigen,
      ]);
    }

    const { rows: duplicada } = await cliente.query(
      'SELECT 1 FROM torneo WHERE certamen_id = $1 AND division = $2',
      [certamenId, datos.division],
    );
    if (duplicada.length > 0) throw crearError('DIVISION_DUPLICADA');

    const { rows: nuevoRows } = await cliente.query<{ id: string }>(
      `INSERT INTO torneo (organizacion_id, certamen_id, division, ${COLUMNAS_COPIADAS.join(', ')})
       SELECT organizacion_id, $2, $3, ${COLUMNAS_COPIADAS.join(', ')}
       FROM torneo WHERE id = $1
       RETURNING id`,
      [datos.torneoIdOrigen, certamenId, datos.division],
    );
    const nuevoTorneoId = nuevoRows[0]!.id;

    const { rows: reglamentoRows } = await cliente.query<{
      texto: string | null;
      archivo_url: string | null;
    }>(`SELECT texto, archivo_url FROM reglamento WHERE torneo_id = $1 AND estado = 'current'`, [
      datos.torneoIdOrigen,
    ]);
    if (reglamentoRows[0]) {
      await cliente.query(
        `INSERT INTO reglamento (torneo_id, numero_version, texto, archivo_url, estado, publicado_por_usuario_id)
         VALUES ($1, 1, $2, $3, 'current', $4)`,
        [nuevoTorneoId, reglamentoRows[0].texto, reglamentoRows[0].archivo_url, contexto.usuarioId],
      );
    }

    await cliente.query(
      `INSERT INTO colaborador_torneo (torneo_id, usuario_id, estado, asignado_por_usuario_id)
       SELECT $1, usuario_id, 'active', $2 FROM colaborador_torneo
       WHERE torneo_id = $3 AND estado = 'active'`,
      [nuevoTorneoId, contexto.usuarioId, datos.torneoIdOrigen],
    );

    await cliente.query('COMMIT');
    return { id: nuevoTorneoId, certamenId, division: datos.division };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
