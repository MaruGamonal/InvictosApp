/**
 * La construcción del enlace vive en `services/notificaciones/enlace.ts`:
 * el correo de una notificación tiene que llevar exactamente al mismo
 * lugar que la notificación tocada, y un servicio no puede importar de
 * una pantalla. Este archivo queda como el nombre con el que la pantalla
 * ya la conocía.
 */
export { construirEnlaceNotificacion, type ModoNavegacion } from '@/services/notificaciones/enlace';
