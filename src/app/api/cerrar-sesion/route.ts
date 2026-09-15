import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { crearClienteServidor, NOMBRE_COOKIE_RECORDAR } from '@/lib/supabase/servidor';

/** Cierra la sesión actual. No hay servicio de negocio detrás: es un detalle de Supabase Auth. */
export async function POST() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(NOMBRE_COOKIE_RECORDAR);
  return NextResponse.json({ ok: true, data: { cerrada: true } });
}
