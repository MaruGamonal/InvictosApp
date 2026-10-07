/**
 * Estados del torneo en los que el panel "Estado" tiene algo que
 * ofrecer. Fuera de ellos —borrador, terminado, cancelado— el panel no
 * renderiza nada y Configuración no muestra la sección: un acordeón que
 * se abre vacío es peor que no estar.
 *
 * **Vive en su propio módulo, sin `'use client'`, y eso no es un
 * detalle.** Nació adentro de `AccionesEstadoTorneo.tsx`, que sí es un
 * componente de cliente, y lo importaba de ahí la página de
 * Configuración, que es de servidor. Al cruzar ese borde Next no pasa
 * el valor: reemplaza cada export del módulo de cliente por una
 * referencia, así que lo que llegaba al servidor no era el `Set` sino un
 * objeto proxy — `TypeError: ESTADOS_CON_ACCIONES_DE_ESTADO.has is not a
 * function`, en producción (reportado por Sentry). Ni el build ni los
 * tests lo vieron: la frontera solo existe en tiempo de ejecución.
 */
export const ESTADOS_CON_ACCIONES_DE_ESTADO = new Set([
  'registration_open',
  'registration_closed',
  'in_progress',
  'suspended',
]);
