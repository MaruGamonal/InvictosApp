import * as Sentry from '@sentry/nextjs';
import { obtenerClienteAdmin } from './supabase/admin';
import { crearError } from './errores';

const BUCKET = 'media';
// Alineado con `TAMANO_MAXIMO_SUBIDA_BYTES` del cliente: por encima de
// esto la plataforma corta el cuerpo antes de que llegue acá, y el
// rechazo no puede explicarse.
const TAMANO_MAXIMO_BYTES = 4 * 1024 * 1024;
const TIPOS_IMAGEN: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const TIPOS_DOCUMENTO: Record<string, string> = {
  'application/pdf': 'pdf',
};

async function subirArchivoPublico(
  carpeta: string,
  archivo: File,
  tiposPermitidos: Record<string, string>,
  mensajeFormato: string,
): Promise<string> {
  const extension = tiposPermitidos[archivo.type];
  if (!extension) {
    throw crearError('DATOS_INVALIDOS', [{ campo: 'archivo', problema: mensajeFormato }]);
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    throw crearError('DATOS_INVALIDOS', [
      { campo: 'archivo', problema: 'El archivo pesa más de 4 MB.' },
    ]);
  }

  const ruta = `${carpeta}/${Date.now()}.${extension}`;
  const admin = obtenerClienteAdmin();
  const { error } = await admin.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: archivo.type,
    upsert: false,
  });
  if (error) {
    // El mensaje del proveedor se manda a Sentry, no al navegador:
    // describe el bucket, la ruta y la política que falló, que no le
    // sirve a quien sube una foto y sí a quien quiera mapear cómo está
    // armado el almacenamiento. `comoRespuestaHttp` incluye `detalle`
    // en la respuesta, así que ponerlo ahí lo publicaba.
    Sentry.captureException(error, { tags: { origen: 'almacenamiento' }, extra: { carpeta } });
    throw crearError('ERROR_INTERNO');
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(ruta);
  return data.publicUrl;
}

/**
 * Sube una imagen (foto de perfil, escudo de equipo) al bucket público
 * `media` con el cliente admin — quien llama ya validó sesión y permiso
 * con los servicios existentes (`actualizarMiPerfil`/`actualizarEquipo`),
 * así que acá no hace falta RLS de escritura, solo de lectura pública.
 *
 * `carpeta` + un nombre con timestamp evitan que el CDN sirva una imagen
 * vieja cacheada después de reemplazarla.
 */
export async function subirImagenPublica(carpeta: string, archivo: File): Promise<string> {
  return subirArchivoPublico(
    carpeta,
    archivo,
    TIPOS_IMAGEN,
    'Formato no soportado — usá JPG, PNG o WEBP.',
  );
}

/** Igual que `subirImagenPublica`, para el PDF adjunto del reglamento (`06`, D-28). */
export async function subirDocumentoPublico(carpeta: string, archivo: File): Promise<string> {
  return subirArchivoPublico(carpeta, archivo, TIPOS_DOCUMENTO, 'Formato no soportado — usá PDF.');
}
