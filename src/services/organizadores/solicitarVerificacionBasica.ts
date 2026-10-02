import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoOrganizacion } from '@/lib/permisos';
import { verificarLimite } from '@/lib/limiteFrecuencia';
import { obtenerClienteAdmin } from '@/lib/supabase/admin';
import { enviarCorreo, hayProveedorDeCorreo } from '@/lib/correo';
import { construirCorreoDeVerificacion } from './_correoDeVerificacion';

/**
 * UC-06 — Solicita la verificación básica de la organización: confirmar
 * la dirección de correo de acceso, por email y no por SMS (`06`, D-76).
 * Exclusivo del Titular (`10`, 4.2).
 *
 * Reutiliza el mismo mecanismo de enlace de acceso de T3 en vez de
 * inventar un sistema de tokens propio: la persona ya demuestra ser
 * quien dice ser al hacer clic y volver con una sesión válida. Qué
 * organización verificar viaja en la **ruta** del enlace de vuelta, que
 * `completarAcceso` lee para invocar `confirmarVerificacionBasica`.
 *
 * **El correo lo escribimos nosotros** (`_correoDeVerificacion.ts`).
 * Supabase tiene seis plantillas fijas y este correo compartía la de
 * Magic Link con la confirmación de cuenta, así que no podía nombrar la
 * organización: quien tiene dos clubes a cargo recibía dos correos
 * idénticos. `generateLink` devuelve el token **sin mandar nada**, y de
 * ahí en adelante el correo es nuestro.
 *
 * Como el enlace lo armamos acá, este flujo tampoco depende ya de la
 * lista de *Redirect URLs* del panel de Supabase, que es donde se
 * perdía el id de la organización cuando la URL no estaba permitida.
 *
 * Sin proveedor de correo propio configurado cae al envío de Supabase,
 * que es lo que había antes: un correo genérico que no nombra la
 * organización, pero que llega. Vale más eso que no poder verificar.
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
  const { rows } = await pool.query<{ email: string; nombre: string; nivel_verificacion: string }>(
    `SELECT u.email, o.nombre, o.nivel_verificacion
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

  // Antes de mandar el correo: si el envío falla, una marca de más no
  // hace nada —nadie va a volver de un correo que no salió— y si se
  // anotara después, un corte entre medio dejaría el enlace sin efecto.
  await pool.query('UPDATE organizacion SET verificacion_solicitada_en = now() WHERE id = $1', [
    datos.organizacionId,
  ]);

  // Qué organización verificar va en la ruta, no en `data`:
  // `signInWithOtp` solo aplica `data` al **crear** la cuenta, y acá va
  // sobre una que ya existe, así que no llegaba y la verificación no
  // hacía nada. Que el id sea visible no alcanza para verificar una
  // organización ajena: `confirmarVerificacionBasica` comprueba que
  // quien vuelve sea el titular.
  const urlDeVuelta = `${URL_DEL_SITIO()}/acceso/confirmar/organizacion/${datos.organizacionId}`;
  const supabase = obtenerClienteAdmin();
  const falloDelEnvio = () =>
    crearError('ERROR_INTERNO', { motivo: 'no se pudo enviar el correo de verificación' });

  if (!hayProveedorDeCorreo()) {
    const { error } = await supabase.auth.signInWithOtp({
      email: fila.email,
      options: { shouldCreateUser: false, emailRedirectTo: urlDeVuelta },
    });
    if (error) throw falloDelEnvio();
    return { enviado: true };
  }

  // `generateLink` **no manda nada**: devuelve el token para que lo
  // mandemos nosotros. Es lo que permite que el correo diga de qué
  // organización se trata.
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: fila.email,
    options: { redirectTo: urlDeVuelta },
  });
  const token = data?.properties?.hashed_token;
  if (error || !token) throw falloDelEnvio();

  const enlace = `${urlDeVuelta}?token_hash=${encodeURIComponent(token)}&type=magiclink`;
  const correo = construirCorreoDeVerificacion({
    nombreOrganizacion: fila.nombre,
    enlace,
  });

  try {
    await enviarCorreo({ para: fila.email, ...correo });
  } catch {
    throw falloDelEnvio();
  }

  return { enviado: true };
};
