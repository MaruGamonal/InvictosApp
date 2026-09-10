import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';
import { subirImagenPublica } from '@/lib/almacenamiento';
import { actualizarEquipo } from '@/services/equipos/actualizarEquipo';

/** UC-10 — Subir el escudo del equipo. Capitán o Delegado. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

    const formulario = await request.formData();
    const archivo = formulario.get('archivo');
    const equipoId = formulario.get('equipoId');
    if (!(archivo instanceof File) || typeof equipoId !== 'string') {
      throw crearError('DATOS_INVALIDOS', [
        { campo: 'archivo/equipoId', problema: 'Falta el archivo o el equipo.' },
      ]);
    }

    const escudoUrl = await subirImagenPublica(`equipos/${equipoId}`, archivo);
    await actualizarEquipo({ equipoId, escudoUrl }, contexto);
    return { escudoUrl };
  });
}
