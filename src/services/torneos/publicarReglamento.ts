import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { notificarCambioDeTorneo } from './_notificarCambio';

/**
 * UC-51 — Publicar una versión nueva del reglamento del torneo.
 * Texto y archivo **no son excluyentes** (`06`, D-28): alcanza con uno
 * de los dos. Cada publicación crea una fila nueva con el número de
 * versión siguiente y pasa la anterior `current` a `superseded` — las
 * versiones anteriores **nunca se borran ni se pisan** (`03`, 3.20),
 * porque en una disputa hay que poder responder qué reglamento regía
 * ese día. Es opcional para el torneo (`06`, D-29): sin reglamento
 * cargado, no hay ninguna versión.
 *
 * Modificar el reglamento con el torneo en curso está permitido y
 * notifica a los equipos inscriptos (`06`, D-22b) — `notificarCambioDeTorneo`
 * ya no-opea sola si todavía no hay ninguno.
 *
 * La subida del archivo a almacenamiento es del cliente (`10`, 2.9):
 * este servicio recibe la URL ya subida, igual que `escudoUrl` o
 * `logoUrl` en otros tickets — no hay un endpoint de subida en el MVP.
 */

const esquemaEntrada = z
  .object({
    torneoId: z.string().uuid(),
    texto: z.string().trim().min(1).optional(),
    archivoUrl: z.string().url().optional(),
  })
  .refine((d) => Boolean(d.texto) || Boolean(d.archivoUrl), {
    message: 'Hace falta cargar un texto y/o adjuntar un archivo.',
  });
export type PublicarReglamentoInput = z.infer<typeof esquemaEntrada>;

export interface PublicarReglamentoResultado {
  id: string;
  numeroVersion: number;
}

export const publicarReglamento: Servicio<
  PublicarReglamentoInput,
  PublicarReglamentoResultado
> = async (input, contexto) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    await cliente.query(
      `UPDATE reglamento SET estado = 'superseded' WHERE torneo_id = $1 AND estado = 'current'`,
      [datos.torneoId],
    );

    const { rows: maxRows } = await cliente.query<{ max: number | null }>(
      'SELECT max(numero_version) FROM reglamento WHERE torneo_id = $1',
      [datos.torneoId],
    );
    const siguienteVersion = (maxRows[0]?.max ?? 0) + 1;

    const { rows } = await cliente.query<{ id: string }>(
      `INSERT INTO reglamento (torneo_id, numero_version, texto, archivo_url, estado, publicado_por_usuario_id)
       VALUES ($1, $2, $3, $4, 'current', $5)
       RETURNING id`,
      [
        datos.torneoId,
        siguienteVersion,
        datos.texto ?? null,
        datos.archivoUrl ?? null,
        contexto.usuarioId,
      ],
    );

    await cliente.query('COMMIT');

    await notificarCambioDeTorneo(datos.torneoId, 'tournament_rules_updated', contexto);

    return { id: rows[0]!.id, numeroVersion: siguienteVersion };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
