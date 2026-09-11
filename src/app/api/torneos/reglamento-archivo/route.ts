import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';
import { subirDocumentoPublico } from '@/lib/almacenamiento';

/**
 * UC-51 — Solo sube el PDF del reglamento y devuelve su URL; publicar
 * la versión (con ese `archivoUrl` y/o el texto tipeado) es un paso
 * aparte, `POST /api/torneos/publicar-reglamento` — mismo criterio que
 * separar "elegir escudo" de "guardar" en la creación del equipo.
 */
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

    const archivoUrl = await subirDocumentoPublico(`torneos/${torneoId}/reglamento`, archivo);
    return { archivoUrl };
  });
}
