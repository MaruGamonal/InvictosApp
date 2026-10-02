import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';

/**
 * El armazón común de todos los correos que escribimos nosotros: la
 * cabecera con el nombre del producto, la tarjeta, el botón y el pie.
 *
 * Vive acá y no al lado del primero que lo necesitó porque ya son dos
 * —los avisos de notificación y el enlace de verificación de una
 * organización— y van a ser más. Dos copias del mismo HTML se separan
 * al primer cambio de color, y nadie se entera hasta que llega un
 * correo con la marca vieja.
 *
 * Los colores acá **sí** son literales, y es la única excepción del
 * sistema (`08`, tema): un cliente de correo no lee variables CSS ni
 * hojas externas. Son los mismos valores de `globals.css`.
 */

export const INK_900 = '#0e1720';
export const ACENTO = '#00a8cc';
export const GRIS_SECUNDARIO = '#5c6a74';
export const FONDO_PAGINA = '#f7f9fa';
export const BLANCO = '#ffffff';

/** Nombres de equipos, torneos y organizaciones los escribe gente: nunca van crudos al HTML. */
export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface PartesDelCorreo {
  /** Va en el `<title>`; el asunto del envío lo decide quien llama. */
  asunto: string;
  /** El encabezado grande de la tarjeta. */
  titulo: string;
  /** Línea secundaria bajo el título. Vacía si no hay nada que agregar. */
  bajada?: string;
  textoBoton: string;
  urlBoton: string;
  /** HTML ya armado del pie. Vacío si el correo no lleva pie. */
  pie?: string;
}

/**
 * Devuelve el HTML completo. Recibe texto **ya escapado** en `titulo` y
 * `bajada`: quien arma el correo sabe qué parte viene de una persona y
 * qué parte es nuestra, y escapar dos veces se ve en el correo.
 */
export function envolverCorreo(partes: PartesDelCorreo): string {
  const bajada = partes.bajada
    ? `<p style="margin:0 0 20px;font:400 15px/1.45 Arial,Helvetica,sans-serif;color:${GRIS_SECUNDARIO};">${partes.bajada}</p>`
    : '';
  const pie = partes.pie
    ? `<div style="padding:0 20px 22px;">
        <p style="margin:0;font:400 12px/1.45 Arial,Helvetica,sans-serif;color:${GRIS_SECUNDARIO};">${partes.pie}</p>
      </div>`
    : '';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(partes.asunto)}</title></head>
<body style="margin:0;padding:24px 16px;background:${FONDO_PAGINA};">
  <div style="max-width:480px;margin:0 auto;background:${BLANCO};border-radius:10px;overflow:hidden;">
    <div style="background:${INK_900};padding:18px 20px;">
      <span style="font:700 20px/1 Arial,Helvetica,sans-serif;letter-spacing:0.02em;color:${BLANCO};">${NOMBRE_PRODUCTO}</span>
    </div>
    <div style="padding:24px 20px;">
      <p style="margin:0 0 8px;font:700 19px/1.25 Arial,Helvetica,sans-serif;color:${INK_900};">${partes.titulo}</p>
      ${bajada}
      <a href="${partes.urlBoton}" style="display:inline-block;background:${ACENTO};color:${INK_900};font:700 14px/1 Arial,Helvetica,sans-serif;text-decoration:none;padding:14px 22px;border-radius:999px;">${partes.textoBoton}</a>
    </div>
    ${pie}
  </div>
</body></html>`;
}
