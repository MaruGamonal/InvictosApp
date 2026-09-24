import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';

/**
 * UC-06 — Al volver de un enlace de correo, aplica la verificación
 * básica que esta persona había pedido.
 *
 * **Por qué existe.** El camino original mandaba el id de la
 * organización dentro de la URL de vuelta y lo leía de la ruta. Eso
 * depende de que la plantilla del correo reenvíe esa URL entera: si
 * arma el enlace con la URL del sitio y le pega el token, el id se
 * pierde. Reportado en vivo — la persona tocaba el enlace, la cuenta
 * quedaba confirmada y la organización seguía sin verificar, sin ningún
 * error que mirar.
 *
 * Acá no hay nada que perder en el camino: se busca qué verificación
 * había pedido quien volvió, y se aplica.
 *
 * **Qué prueba esto.** Exactamente lo mismo que antes: que la persona
 * controla la casilla de correo de acceso (`06`, D-76). Volver de
 * cualquier enlace que mandamos a esa dirección es esa prueba. Por eso
 * alcanza con haber pedido la verificación y volver — no hace falta que
 * el enlace sea el de verificación.
 *
 * **Qué no hace.** No verifica organizaciones ajenas: solo mira las que
 * tienen a quien vuelve como **titular**, que es quien puede pedirlo
 * (`10`, 4.2). Y no revive pedidos viejos: el enlace de acceso dura una
 * hora, así que un pedido de hace días ya no tiene un correo válido
 * detrás.
 */

/** Holgura sobre la vida del enlace, que es de una hora. */
const HORAS_DE_VALIDEZ = 24;

export interface VerificacionAplicada {
  organizacionId: string;
  nombre: string;
}

export const confirmarVerificacionesPendientes: Servicio<void, VerificacionAplicada[]> = async (
  _input,
  contexto,
) => {
  if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ id: string; nombre: string }>(
    `UPDATE organizacion
     SET nivel_verificacion = 'basic',
         fecha_verificacion = now(),
         verificacion_solicitada_en = NULL
     WHERE usuario_titular_id = $1
       AND verificacion_solicitada_en IS NOT NULL
       AND verificacion_solicitada_en > now() - ($2 || ' hours')::interval
       AND nivel_verificacion = 'unverified'
     RETURNING id, nombre`,
    [contexto.usuarioId, String(HORAS_DE_VALIDEZ)],
  );

  return rows.map((fila) => ({ organizacionId: fila.id, nombre: fila.nombre }));
};
