'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NOMBRE_COOKIE_ORGANIZACION_ACTIVA } from '@/lib/cookies';

/** Un año, mismo criterio que la ciudad del descubrimiento (D-90). */
const UN_ANIO_EN_SEGUNDOS = 60 * 60 * 24 * 365;

/**
 * Pasar a gestionar otra de las organizaciones de la persona.
 *
 * El nombre de la cookie vive en `@/lib/cookies` y no acá: un módulo
 * `'use server'` solo puede exportar funciones asíncronas, y además la
 * lee la API que crea torneos, que no tiene por qué depender de una
 * pantalla del panel.
 */
export async function elegirOrganizacionActiva(organizacionId: string): Promise<void> {
  const store = await cookies();
  store.set(NOMBRE_COOKIE_ORGANIZACION_ACTIVA, organizacionId, {
    maxAge: UN_ANIO_EN_SEGUNDOS,
    path: '/',
    sameSite: 'lax',
  });
  redirect('/organizador/gestionar');
}
