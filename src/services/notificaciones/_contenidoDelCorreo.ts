import { obtenerEtiqueta } from '@/lib/etiquetas';
import { escapar, envolverCorreo, GRIS_SECUNDARIO } from '@/lib/plantillaDeCorreo';
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
 * El armazón —cabecera, tarjeta, botón, pie— y los colores salen de
 * `lib/plantillaDeCorreo.ts`, compartidos con los demás correos que
 * escribimos nosotros.
 */

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

  const html = envolverCorreo({
    asunto,
    titulo: escapar(titulo),
    bajada: datos.nombreEntidad ? escapar(datos.nombreEntidad) : undefined,
    textoBoton: `Ver en ${NOMBRE_PRODUCTO}`,
    urlBoton: destino,
    pie: `Recibís este correo porque tenés avisos activados.
        <a href="${preferencias}" style="color:${GRIS_SECUNDARIO};">Cambiar qué avisos recibo</a>.`,
  });

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
