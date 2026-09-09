import { NextResponse } from 'next/server';
import { crearClienteServidor } from '@/lib/supabase/servidor';

/** Cierra la sesión actual. No hay servicio de negocio detrás: es un detalle de Supabase Auth. */
export async function POST() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true, data: { cerrada: true } });
}
