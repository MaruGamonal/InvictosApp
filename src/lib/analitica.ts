/**
 * Los cuatro eventos de producto de T28 (`09`, sección 4) — y nada más.
 * Los umbrales de D-51 y D-61 se calibran con consultas a la base, no
 * con analítica; agregar un quinto evento acá es exactamente el ruido
 * que `pasos-infraestructura-T28.md` pide evitar.
 *
 * `inscripcionIniciada` e `inscripcionEnviada` todavía no se emiten
 * desde ningún lado: el flujo de clic de inscripción (el modal que
 * pide cuenta y completa la solicitud) es UI que ningún ticket
 * construyó todavía (ver el comentario D-04b en `torneo/[id]/page.tsx`)
 * — no hay desde dónde dispararlos sin inventar la pantalla.
 */
export const EVENTOS_ANALITICA = {
  fichaTorneoVista: 'ficha_torneo_vista',
  inscripcionIniciada: 'inscripcion_iniciada',
  inscripcionEnviada: 'inscripcion_enviada',
  ciudadSinTorneos: 'ciudad_sin_torneos',
} as const;
