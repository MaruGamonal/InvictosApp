/**
 * Lo que se le dice a alguien **antes** de darle un rol.
 *
 * Vive acá y no en cada formulario porque invitar administradores se
 * hace desde dos pantallas —el panel del torneo y la pantalla propia
 * del equipo de trabajo— y la descripción estaba escrita dos veces,
 * palabra por palabra. Dos copias de la misma frase se separan al
 * primer ajuste de wording, y a partir de ahí la misma acción se
 * explica distinto según por dónde se entre.
 *
 * No va en `etiquetas.ts`: aquello es el catálogo de nombres cortos de
 * estados y roles ("Administrador", "Titular"), con su color. Esto es
 * una frase que describe el alcance, y sólo aparece donde se otorga.
 */
export const DESCRIPCION_ADMINISTRADOR =
  'Un Administrador opera sobre todos los torneos de la organización, igual que vos — salvo que no puede sumar ni sacar administradores.';
