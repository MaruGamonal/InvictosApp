/**
 * Las secciones de Configuración, en el orden en que se muestran.
 *
 * Es un módulo propio y no una constante dentro de alguna página
 * porque lo leen ocho archivos: el índice, para armar el menú, y cada
 * sección, para titularse igual que la fila que llevó hasta ella. Si el
 * título viviera en los dos lados, la fila y la pantalla se iban a
 * separar sola la primera vez que alguien reescribiera uno.
 *
 * Sin `'use client'`, a propósito: la importan componentes de servidor,
 * y un valor exportado desde un módulo de cliente no cruza esa frontera
 * (ver `_clienteSinValoresExportados.arquitectura.test.ts`).
 */

export const SECCIONES_CONFIGURACION = {
  datos: 'Datos del torneo',
  formato: 'Formato',
  divisiones: 'Divisiones',
  reglamento: 'Reglamento',
  colaboradores: 'Colaboradores de este torneo',
  administradores: 'Equipo de trabajo de la organización',
  estado: 'Estado',
} as const;

export type SeccionConfiguracion = keyof typeof SECCIONES_CONFIGURACION;
