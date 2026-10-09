import type { NextRequest } from 'next/server';
import { comoRespuestaHttp } from '@/lib/respuesta';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { buscarEquipos } from '@/services/equipos/buscarEquipos';
import { construirContexto } from '@/lib/contexto';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';

/**
 * Buscar equipos por nombre. Lectura pública, como la pantalla de
 * equipos: `buscarEquipos` no mira la sesión para nada.
 *
 * Existe para que el organizador, al cargar un equipo a mano (UC-26),
 * pueda encontrar uno que ya está en la plataforma en vez de crear un
 * duplicado vacío al lado del que tiene plantel e historial.
 */
export async function GET(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const { searchParams } = new URL(request.url);
    const texto = searchParams.get('texto')?.trim();
    return buscarEquipos({ texto: texto || undefined, tamanoPagina: 8 }, CONTEXTO_PUBLICO);
  });
}

/** UC-10 — Crear equipo. Pide sesión real. */
export async function POST(request: NextRequest) {
  return comoRespuestaHttp(async () => {
    const body = await request.json();
    const contexto = await construirContexto();
    return crearEquipo(body, contexto);
  });
}
