'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NOMBRE_COOKIE_CIUDAD } from '@/lib/cookiesDescubrimiento';

const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

/**
 * UC-22 — Elegir ciudad para el descubrimiento (`06`, D-90): se pide en
 * el primer uso, no en el registro, y se recuerda — por eso vive en una
 * cookie de un año, no en el perfil. Cambiar de ciudad para explorar
 * otra es la única forma de tocarla: nunca se infiere (D-89/D-90).
 */
export async function elegirCiudad(ciudadId: string): Promise<void> {
  await guardarCiudad(ciudadId);
  redirect('/torneos');
}

/**
 * La misma acción desde `/equipos`, que comparte la cookie: elegir la
 * ciudad en una pantalla vale para la otra, porque son el mismo sistema
 * de descubrimiento.
 *
 * Son dos acciones y no una con el destino por parámetro a propósito: el
 * destino de un `redirect` nunca sale de algo que mande el cliente.
 */
export async function elegirCiudadEnEquipos(ciudadId: string): Promise<void> {
  await guardarCiudad(ciudadId);
  redirect('/equipos');
}

async function guardarCiudad(ciudadId: string): Promise<void> {
  const store = await cookies();
  store.set(NOMBRE_COOKIE_CIUDAD, ciudadId, {
    maxAge: UN_ANIO_EN_SEGUNDOS,
    path: '/',
    sameSite: 'lax',
  });
}
