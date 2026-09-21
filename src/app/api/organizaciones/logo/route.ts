import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';
import { subirImagenPublica } from '@/lib/almacenamiento';
import { verificarPermisoOrganizacion } from '@/lib/permisos';
import { actualizarOrganizacion } from '@/services/organizadores/actualizarOrganizacion';

/** UC-06 — Subir el logo de la organización. Titular o Administrador. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

    const formulario = await request.formData();
    const archivo = formulario.get('archivo');
    const organizacionId = formulario.get('organizacionId');
    if (!(archivo instanceof File) || typeof organizacionId !== 'string') {
      throw crearError('DATOS_INVALIDOS', [
        { campo: 'archivo/organizacionId', problema: 'Falta el archivo o la organización.' },
      ]);
    }

    // Antes de escribir en el bucket: si no, un rechazo posterior deja
    // igual el archivo subido y accesible.
    await verificarPermisoOrganizacion(contexto, organizacionId, 'actualizar_organizacion');

    const logoUrl = await subirImagenPublica(`organizaciones/${organizacionId}`, archivo);
    await actualizarOrganizacion({ organizacionId, logoUrl }, contexto);
    return { logoUrl };
  });
}
