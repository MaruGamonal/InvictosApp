import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { buscarDirecciones } from '@/lib/geocodificacion';

/** UC-16 — Autocompletar de dirección al crear/editar un torneo. Ruta pública, sin sesión. */
export async function GET(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const { searchParams } = new URL(request.url);
    const consulta = searchParams.get('q')?.trim() ?? '';
    if (consulta.length < 3) return { resultados: [] };
    return { resultados: await buscarDirecciones(consulta) };
  });
}
