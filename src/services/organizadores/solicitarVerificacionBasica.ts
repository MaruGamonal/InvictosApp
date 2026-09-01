import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoOrganizacion } from '@/lib/permisos';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { obtenerClienteAdmin } from '@/lib/supabase/admin';

/**
 * UC-06 — Solicita la verificación básica de la organización: confirmar
 * la dirección de correo de acceso, por email y no por SMS (`06`, D-76).
 * Exclusivo del Titular (`10`, 4.2).
 *
 * Reutiliza el mismo mecanismo de enlace de acceso de T3 en vez de
 * inventar un sistema de tokens propio: la persona ya demuestra ser
 * quien dice ser al hacer clic y volver con una sesión válida. La
 * metadata del enlace lleva `accion: 'verificar_organizacion'`, que
 * `src/app/auth/callback` usa para invocar `confirmarVerificacionBasica`
 * en vez del flujo de alta.
 */

const esquemaEntrada = z.object({ organizacionId: z.string().uuid() });
export type SolicitarVerificacionBasicaInput = z.infer<typeof esquemaEntrada>;

const LIMITE_CORREOS_VERIFICACION = { maximoIntentos: 5, ventanaMs: 15 * 60 * 1000 };
const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const solicitarVerificacionBasica: Servicio<
  SolicitarVerificacionBasicaInput,
  { enviado: true }
> = async (input, contexto) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoOrganizacion(contexto, datos.organizacionId, 'solicitar_verificacion');

  const pool = obtenerPool();
  const { rows } = await pool.query<{ email: string; nivel_verificacion: string }>(
    `SELECT u.email, o.nivel_verificacion
     FROM organizacion o JOIN usuario u ON u.id = o.usuario_titular_id
     WHERE o.id = $1`,
    [datos.organizacionId],
  );
  const fila = rows[0];
  if (!fila) throw crearError('NO_ENCONTRADO');

  if (!verificarLimite(`verificacion-org:${datos.organizacionId}`, LIMITE_CORREOS_VERIFICACION)) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'organizacionId', problema: 'Demasiados intentos. Probá de nuevo más tarde.' },
    ]);
  }

  const supabase = obtenerClienteAdmin();
  const { error } = await supabase.auth.signInWithOtp({
    email: fila.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${URL_DEL_SITIO()}/auth/callback`,
      data: { accion: 'verificar_organizacion', organizacion_id: datos.organizacionId },
    },
  });
  if (error)
    throw crearError('ERROR_INTERNO', { motivo: 'no se pudo enviar el correo de verificación' });

  return { enviado: true };
};
