import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';
import { subirImagenPublica } from '@/lib/almacenamiento';
import { verificarPermisoTorneo } from '@/lib/permisos';
import { actualizarTorneo } from '@/services/torneos/actualizarTorneo';

/** UC-19 — Subir la portada del torneo. Titular/Administrador de la organización. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

    const formulario = await request.formData();
    const archivo = formulario.get('archivo');
    const torneoId = formulario.get('torneoId');
    if (!(archivo instanceof File) || typeof torneoId !== 'string') {
      throw crearError('DATOS_INVALIDOS', [
        { campo: 'archivo/torneoId', problema: 'Falta el archivo o el torneo.' },
      ]);
    }

    // Antes de escribir en el bucket: si no, un rechazo posterior deja
    // igual el archivo subido y accesible.
    await verificarPermisoTorneo(contexto, torneoId, 'configurar_torneo');

    const imagenUrl = await subirImagenPublica(`torneos/${torneoId}`, archivo);
    await actualizarTorneo({ torneoId, imagenUrl }, contexto);
    return { imagenUrl };
  });
}
