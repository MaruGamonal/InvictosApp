/**
 * El único lugar del producto que le habla a un proveedor de correo
 * transaccional.
 *
 * Está detrás de una función y no repartido por los servicios a
 * propósito: cambiar de proveedor —o poner uno de prueba— toca este
 * archivo y ninguno más. Hoy la implementación es **Resend**, por su
 * API HTTP simple y porque no obliga a sumar una dependencia: se
 * resuelve con `fetch`.
 *
 * No confundir con `emailConfirmacion.ts`, que manda los enlaces de
 * Supabase Auth (confirmar cuenta, recuperar contraseña, verificar
 * organización). Aquellos son correos **de autenticación** y los arma
 * Supabase con sus propias plantillas; éste es el correo **de
 * producto**, con nuestro texto.
 */

/** Lo que el proveedor necesita para mandar un correo. */
export interface CorreoAEnviar {
  para: string;
  asunto: string;
  html: string;
  /** Alternativa en texto plano. Sin esto, varios clientes lo marcan como spam. */
  texto: string;
}

/**
 * Motivo por el que un correo no salió. Lo consume quien despacha, para
 * decidir si reintentar: una casilla inválida no mejora reintentando,
 * una caída del proveedor sí.
 */
export type MotivoDeFallo = 'sin_configurar' | 'rechazado' | 'proveedor_caido';

export class ErrorDeCorreo extends Error {
  readonly motivo: MotivoDeFallo;
  /** `false` para lo que no va a mejorar solo: casilla inválida, remitente no verificado. */
  readonly reintentable: boolean;

  constructor(motivo: MotivoDeFallo, mensaje: string, reintentable: boolean) {
    super(mensaje);
    this.name = 'ErrorDeCorreo';
    this.motivo = motivo;
    this.reintentable = reintentable;
  }
}

const URL_RESEND = 'https://api.resend.com/emails';

/**
 * `true` si hay con qué mandar. Quien llama lo consulta para no armar
 * el contenido de un correo que no va a salir — en desarrollo, donde no
 * hay clave, eso sería trabajo puro.
 */
export function hayProveedorDeCorreo(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.CORREO_REMITENTE);
}

/**
 * Manda un correo. Lanza `ErrorDeCorreo` si no sale; **nunca** devuelve
 * en silencio un fallo, porque el estado de la notificación se decide
 * con esto.
 */
export async function enviarCorreo(correo: CorreoAEnviar): Promise<void> {
  const clave = process.env.RESEND_API_KEY;
  const remitente = process.env.CORREO_REMITENTE;

  if (!clave || !remitente) {
    throw new ErrorDeCorreo(
      'sin_configurar',
      'Faltan RESEND_API_KEY o CORREO_REMITENTE: el correo no se mandó.',
      // Reintentable: es una variable de entorno que alguien puede
      // cargar. La notificación tiene que quedar esperando, no perderse.
      true,
    );
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(URL_RESEND, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: remitente,
        to: [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
      }),
    });
  } catch (error) {
    // La red se cayó o el proveedor no respondió. Vale reintentar.
    throw new ErrorDeCorreo(
      'proveedor_caido',
      error instanceof Error ? error.message : 'No se pudo llegar al proveedor de correo.',
      true,
    );
  }

  // `fetch` no lanza con 4xx ni 5xx: si esto no estuviera, un correo
  // rechazado se contaría como enviado.
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    // 4xx es nuestro problema (casilla inválida, remitente sin
    // verificar): reintentar no lo arregla. 5xx y 429 son del
    // proveedor, y esos sí mejoran solos.
    const reintentable = respuesta.status >= 500 || respuesta.status === 429;
    throw new ErrorDeCorreo(
      reintentable ? 'proveedor_caido' : 'rechazado',
      `El proveedor respondió ${respuesta.status}: ${detalle.slice(0, 300)}`,
      reintentable,
    );
  }
}
