/**
 * Subida de archivos desde el navegador, compartida por las ocho
 * pantallas que suben algo.
 *
 * Existe por dos fallas que tenían todas. La primera: el tope del
 * servidor era de 5 MB, pero la plataforma corta el cuerpo de una
 * petición **antes**, cerca de los 4,5 MB, y responde con una página
 * que no es JSON. La foto de cualquier teléfono entra en ese rango. La
 * segunda: el `catch` que envolvía al `fetch` también atrapaba el
 * `respuesta.json()` de esa página, así que un archivo demasiado grande
 * se reportaba como "No pudimos conectar" — un problema de red que no
 * existía, y ningún camino para entender qué hacer.
 *
 * Ahora el tamaño se comprueba **antes** de mandar nada, y una respuesta
 * que no es JSON se distingue de una caída real de la conexión.
 */

/** Por debajo del tope de la plataforma, con margen para el resto del formulario. */
export const TAMANO_MAXIMO_SUBIDA_BYTES = 4 * 1024 * 1024;

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
export const TIPOS_DOCUMENTO = ['application/pdf'];

/** Con un decimal para el archivo: redondear dejaba mensajes como "pesa 4 MB y el máximo es 4 MB". */
const MEGABYTES = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1).replace('.0', '');

/** Devuelve el problema a mostrar, o `null` si el archivo sirve. */
export function validarArchivo(archivo: File, tiposAceptados: string[]): string | null {
  if (!tiposAceptados.includes(archivo.type)) {
    const formatos = tiposAceptados.includes('application/pdf') ? 'PDF' : 'JPG, PNG o WEBP';
    return `Formato no soportado — usá ${formatos}.`;
  }
  if (archivo.size > TAMANO_MAXIMO_SUBIDA_BYTES) {
    return `La imagen pesa ${MEGABYTES(archivo.size)} MB y el máximo es ${MEGABYTES(
      TAMANO_MAXIMO_SUBIDA_BYTES,
    )} MB. Probá con una más liviana.`;
  }
  return null;
}

export type ResultadoSubida =
  { ok: true; data: Record<string, string> } | { ok: false; mensaje: string };

export async function subirArchivo(
  url: string,
  datosFormulario: FormData,
): Promise<ResultadoSubida> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { method: 'POST', body: datosFormulario });
  } catch {
    return { ok: false, mensaje: 'No pudimos conectar. Probá de nuevo.' };
  }

  let cuerpo: { ok?: boolean; data?: Record<string, string>; error?: { mensaje?: string } };
  try {
    cuerpo = await respuesta.json();
  } catch {
    // La plataforma rechazó el cuerpo antes de llegar a la aplicación y
    // respondió algo que no es JSON. Casi siempre es el tamaño.
    return {
      ok: false,
      mensaje:
        respuesta.status === 413
          ? 'El archivo es demasiado grande. Probá con uno más liviano.'
          : 'No pudimos subir el archivo. Probá de nuevo en un momento.',
    };
  }

  if (!respuesta.ok || !cuerpo.ok || !cuerpo.data) {
    return {
      ok: false,
      mensaje: cuerpo.error?.mensaje ?? 'No pudimos subir el archivo. Probá de nuevo.',
    };
  }

  return { ok: true, data: cuerpo.data };
}
