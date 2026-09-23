'use client';

import { useEffect, useState } from 'react';
import { consultarSesion, leerRecordada } from '@/lib/sesionDelCliente';

/**
 * Si quien mira tiene sesión: `null` mientras no se sabe.
 *
 * Arranca con lo recordado de la pantalla anterior, así que al navegar
 * el primer render ya trae la respuesta y no hay parpadeo. Igual
 * consulta de verdad por detrás y corrige si cambió —por ejemplo, si la
 * sesión venció en otra pestaña—.
 *
 * En la primera carga de la sesión no hay nada recordado y devuelve
 * `null` hasta que conteste, que es el comportamiento que ya había.
 *
 * `consultar: false` la apaga del todo: para quien ya recibió la
 * respuesta del servidor y no tiene nada que preguntar. No alcanza con
 * ignorar lo que devuelve —los hooks no se pueden llamar condicionalmente,
 * así que la única forma de no pedir es decírselo—.
 */
export function useSesion(consultar = true): boolean | null {
  // Función de inicialización, no valor: `sessionStorage` no existe
  // durante el render del servidor y leerlo ahí rompería la hidratación.
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    if (!consultar) return;
    let cancelado = false;

    const recordada = leerRecordada();
    if (recordada !== null) setAutenticado(recordada);

    void consultarSesion().then((respuesta) => {
      if (!cancelado) setAutenticado(respuesta);
    });

    return () => {
      cancelado = true;
    };
  }, [consultar]);

  return autenticado;
}
