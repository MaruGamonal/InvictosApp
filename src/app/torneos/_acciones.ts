'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NOMBRE_COOKIE_CATEGORIA_GENERO, NOMBRE_COOKIE_CIUDAD } from './_constantes';

const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

/**
 * UC-22 — Elegir ciudad para el descubrimiento (`06`, D-90): se pide en
 * el primer uso, no en el registro, y se recuerda — por eso vive en una
 * cookie de un año, no en el perfil. Cambiar de ciudad para explorar
 * otra es la única forma de tocarla: nunca se infiere (D-89/D-90).
 */
export async function elegirCiudad(ciudadId: string): Promise<void> {
  const store = await cookies();
  store.set(NOMBRE_COOKIE_CIUDAD, ciudadId, {
    maxAge: UN_ANIO_EN_SEGUNDOS,
    path: '/',
    sameSite: 'lax',
  });
  redirect('/torneos');
}

/**
 * Preferencia de categoría a mostrar en el descubrimiento — mismo
 * criterio que la ciudad (D-90): se elige en pantalla, se recuerda en
 * cookie, nunca se infiere. Sin preferencia (`valor` vacío) se ven
 * todas las categorías; el propio `buscarTorneos` ya trata un torneo
 * mixto como válido para cualquier preferencia.
 */
export async function elegirCategoriaGenero(valor: string): Promise<void> {
  const store = await cookies();
  if (!valor) {
    store.delete(NOMBRE_COOKIE_CATEGORIA_GENERO);
  } else {
    store.set(NOMBRE_COOKIE_CATEGORIA_GENERO, valor, {
      maxAge: UN_ANIO_EN_SEGUNDOS,
      path: '/',
      sameSite: 'lax',
    });
  }
  redirect('/torneos');
}
