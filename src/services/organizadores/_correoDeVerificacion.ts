import { escapar, envolverCorreo } from '@/lib/plantillaDeCorreo';

/**
 * El correo que pide verificar una organización.
 *
 * Lo escribimos nosotros en vez de dejarlo en manos de Supabase por una
 * razón concreta: **Supabase tiene seis plantillas fijas y este correo
 * compartía la de Magic Link con la confirmación de cuenta**, así que
 * no había forma de que dijera qué organización se está verificando.
 * Quien tiene dos clubes a cargo recibía dos correos idénticos y tenía
 * que adivinar cuál era cuál.
 *
 * Es una función pura: el enlace ya viene armado, con su token. Quien
 * llama es `solicitarVerificacionBasica`.
 */

export interface DatosDelCorreoDeVerificacion {
  nombreOrganizacion: string;
  /** El enlace completo, con `token_hash`. */
  enlace: string;
}

export interface CorreoDeVerificacionArmado {
  asunto: string;
  html: string;
  texto: string;
}

export function construirCorreoDeVerificacion(
  datos: DatosDelCorreoDeVerificacion,
): CorreoDeVerificacionArmado {
  // El nombre va en el asunto y no sólo en el cuerpo: en el teléfono se
  // ve la lista de asuntos antes que cualquier otra cosa, y ahí es donde
  // hace falta distinguir un correo del otro.
  const asunto = `Verificá ${datos.nombreOrganizacion}`;
  const nombre = escapar(datos.nombreOrganizacion);

  const html = envolverCorreo({
    asunto,
    titulo: `Verificá ${nombre}`,
    bajada:
      'Tocá el botón para confirmar que esta dirección es tuya. ' +
      'Verificada, la organización aparece en las búsquedas y puede tener ' +
      'más de un torneo publicado a la vez.',
    textoBoton: 'Verificar organización',
    urlBoton: datos.enlace,
    pie: 'El enlace sirve una sola vez. Si no pediste esto, ignorá el correo: sin tocarlo no cambia nada.',
  });

  const texto = [
    `Verificá ${datos.nombreOrganizacion}`,
    '',
    'Tocá el enlace para confirmar que esta dirección es tuya. Verificada, la',
    'organización aparece en las búsquedas y puede tener más de un torneo',
    'publicado a la vez.',
    '',
    datos.enlace,
    '',
    'El enlace sirve una sola vez. Si no pediste esto, ignorá el correo: sin',
    'tocarlo no cambia nada.',
  ].join('\n');

  return { asunto, html, texto };
}
