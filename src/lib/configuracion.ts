/**
 * Valores de arranque a calibrar con datos de uso (`06`, sección 2) — no
 * son reglas de negocio, son números que había que fijar para poder
 * construir. Viven en un solo lugar para poder ajustarlos sin salir a
 * buscarlos por el código.
 */
export const CONFIGURACION = {
  /** Torneos publicados simultáneos que puede tener una organización sin verificar (`06`, D-51). */
  limiteTorneosPublicadosSinVerificar: 1,
  /** Plazo de confirmación automática de un resultado cargado (`06`, D-60). */
  horasConfirmacionAutomaticaResultado: 72,
} as const;
