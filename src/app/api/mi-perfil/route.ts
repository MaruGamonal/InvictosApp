import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { construirContexto } from '@/lib/contexto';
import { actualizarMiPerfil } from '@/services/identidad/actualizarMiPerfil';
import { configurarVisibilidad } from '@/services/identidad/configurarVisibilidad';

/**
 * UC-02/UC-04 — Editar mi perfil. Un solo POST para los dos servicios
 * (datos del perfil + visibilidad): del lado del formulario es un único
 * "Guardar", no dos acciones separadas.
 */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    const { visibilidad, ...datosPerfil } = body ?? {};

    if (Object.keys(datosPerfil).length > 0) {
      await actualizarMiPerfil(datosPerfil, contexto);
    }
    if (visibilidad) {
      await configurarVisibilidad({ visibilidad }, contexto);
    }
    return { ok: true };
  });
}
