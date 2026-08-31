import { NextResponse } from 'next/server';
import { verificarConexionBaseDeDatos } from '@/services/plataforma/verificarConexionBaseDeDatos';
import { contextoDeSistema } from '@/lib/contexto';

export async function GET() {
  const resultado = await verificarConexionBaseDeDatos(undefined, contextoDeSistema());
  return NextResponse.json(resultado);
}
