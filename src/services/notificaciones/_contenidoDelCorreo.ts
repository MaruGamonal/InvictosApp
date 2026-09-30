import { obtenerEtiqueta } from '@/lib/etiquetas';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import { construirEnlaceNotificacion } from './enlace';
import type { TipoNotificacion } from './tipos';

/**
 * El texto de un correo de notificación.
 *
 * **El asunto sale de `etiquetas.ts`**, el mismo catálogo que usa el
 * centro de notificaciones: "Te invitaron a un equipo", "Confirmá el
 * resultado de tu partido". No se escribe un segundo juego de frases
 * para el correo — dos catálogos del mismo aviso se separan al primer
 * cambio de wording, y la persona recibe un mail que dice una cosa y
 * encuentra otra al entrar.
 *
 * **El enlace sale de `enlace.ts`**, por la misma razón: el botón del
 * correo lleva exactamente a donde lleva tocar la notificación.
 *
 * Los colores acá **sí** son literales, y es la única excepción del
 * sistema (`08`, tema): un cliente de correo no lee variables CSS ni
 * hojas externas. Son los mismos valores de `globals.css`.
 */

const INK_900 = '#0e1720';
const ACENTO = '#00a8cc';
const GRIS_SECUNDARIO = '#5c6a74';
const FONDO_PAGINA = '#f7f9fa';
const BLANCO = '#ffffff';

export interface DatosDelCorreo {
  tipo: TipoNotificacion;
  entidadOrigenTipo: string | null;
  entidadOrigenId: string | null;
  /** El nombre del equipo o del torneo, ya resuelto. `null` si no se pudo. */
  nombreEntidad: string | null;
}

export interface CorreoArmado {
  asunto: string;
  html: string;
  texto: string;
}

/** Nombres de equipos y torneos los escribe gente: nunca van crudos al HTML. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Arma asunto, HTML y texto plano. Es una función pura: quien la llama
 * ya resolvió el nombre de la entidad contra la base.
 *
 * `urlDelSitio` viene sin barra final y se usa para volver absolutos
 * los enlaces relativos de `enlace.ts` — un correo no tiene origen
 * contra el cual resolver una ruta.
 */
export function construirCorreoDeNotificacion(
  datos: DatosDelCorreo,
  urlDelSitio: string,
): CorreoArmado {
  const titulo = obtenerEtiqueta('notificacion.tipo', datos.tipo).etiqueta;

  // Sin modo: un correo se lee fuera de la aplicación, así que no hay
  // un contexto de trabajo que preservar. Cae al de jugador, que es el
  // enlace público de cada entidad.
  const ruta = construirEnlaceNotificacion(
    datos.tipo,
    datos.entidadOrigenTipo,
    datos.entidadOrigenId,
    'jugador',
  );
  // Las de origen `partido` no tienen pantalla propia todavía: el
  // correo lleva al centro de notificaciones en vez de a un 404.
  const destino = `${urlDelSitio}${ruta ?? '/notificaciones'}`;
  const preferencias = `${urlDelSitio}/notificaciones/preferencias`;

  const asunto = datos.nombreEntidad ? `${titulo} — ${datos.nombreEntidad}` : titulo;

  const lineaEntidad = datos.nombreEntidad
    ? `<p style="margin:0 0 20px;font:400 15px/1.45 Arial,Helvetica,sans-serif;color:${GRIS_SECUNDARIO};">${escapar(datos.nombreEntidad)}</p>`
    : '';

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(asunto)}</title></head>
<body style="margin:0;padding:24px 16px;background:${FONDO_PAGINA};">
  <div style="max-width:480px;margin:0 auto;background:${BLANCO};border-radius:10px;overflow:hidden;">
    <div style="background:${INK_900};padding:18px 20px;">
      <span style="font:700 20px/1 Arial,Helvetica,sans-serif;letter-spacing:0.02em;color:${BLANCO};">${NOMBRE_PRODUCTO}</span>
    </div>
    <div style="padding:24px 20px;">
      <p style="margin:0 0 8px;font:700 19px/1.25 Arial,Helvetica,sans-serif;color:${INK_900};">${escapar(titulo)}</p>
      ${lineaEntidad}
      <a href="${destino}" style="display:inline-block;background:${ACENTO};color:${INK_900};font:700 14px/1 Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 22px;border-radius:999px;">Ver en ${NOMBRE_PRODUCTO}</a>
    </div>
    <div style="padding:0 20px 22px;">
      <p style="margin:0;font:400 12px/1.45 Arial,Helvetica,sans-serif;color:${GRIS_SECUNDARIO};">
        Recibís este correo porque tenés avisos activados.
        <a href="${preferencias}" style="color:${GRIS_SECUNDARIO};">Cambiar qué avisos recibo</a>.
      </p>
    </div>
  </div>
</body></html>`;

  const texto = [
    titulo,
    datos.nombreEntidad ?? '',
    '',
    destino,
    '',
    `Para cambiar qué avisos recibís: ${preferencias}`,
  ]
    .filter((linea, indice, todas) => !(linea === '' && todas[indice - 1] === ''))
    .join('\n');

  return { asunto, html, texto };
}
