import { obtenerPool } from '@/db/cliente';
import type { Contexto } from '@/lib/contexto';

/**
 * Qué le falta a la persona para poder crear algo, resuelto **antes** de
 * renderizar el formulario.
 *
 * Reportado en vivo: las dos pantallas de creación mostraban el
 * formulario entero con un aviso arriba, así que se podía completar todo
 * y recién enterarse al enviar de que la acción estaba bloqueada. El
 * dato para decidirlo ya está en la base y la página es un componente de
 * servidor: se puede saber antes de dibujar nada.
 *
 * Los servicios siguen comprobando lo mismo por su cuenta. Esto se
 * adelanta al trabajo perdido, no lo reemplaza.
 */
export interface EstadoParaCrear {
  cuentaConfirmada: boolean;
  tieneOrganizacion: boolean;
}

export async function estadoParaCrear(contexto: Contexto): Promise<EstadoParaCrear> {
  if (!contexto.usuarioId) return { cuentaConfirmada: false, tieneOrganizacion: false };

  const pool = obtenerPool();
  const { rows } = await pool.query<{ email_confirmado: boolean; tiene_organizacion: boolean }>(
    `SELECT u.email_confirmado,
            EXISTS (
              SELECT 1 FROM miembro_organizacion m
              WHERE m.usuario_id = u.id AND m.rol = 'owner'
            ) AS tiene_organizacion
     FROM usuario u WHERE u.id = $1`,
    [contexto.usuarioId],
  );
  const fila = rows[0];

  // Sin fila no se asume nada a favor: es el mismo criterio que
  // `verificarCuentaConfirmada`, que niega cuando no puede comprobar.
  if (!fila) return { cuentaConfirmada: false, tieneOrganizacion: false };

  return {
    cuentaConfirmada: fila.email_confirmado,
    tieneOrganizacion: fila.tiene_organizacion,
  };
}
