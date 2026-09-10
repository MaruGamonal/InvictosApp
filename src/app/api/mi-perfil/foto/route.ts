import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { crearError } from '@/lib/errores';
import { subirImagenPublica } from '@/lib/almacenamiento';
import { actualizarMiPerfil } from '@/services/identidad/actualizarMiPerfil';

/** UC-02 — Subir mi foto de perfil. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const contexto = await construirContexto();
    if (!contexto.usuarioId) throw crearError('NO_AUTENTICADO');

    const formulario = await request.formData();
    const archivo = formulario.get('archivo');
    if (!(archivo instanceof File)) {
      throw crearError('DATOS_INVALIDOS', [{ campo: 'archivo', problema: 'Falta el archivo.' }]);
    }

    const fotoUrl = await subirImagenPublica(`perfiles/${contexto.usuarioId}`, archivo);
    await actualizarMiPerfil({ fotoUrl }, contexto);
    return { fotoUrl };
  });
}
