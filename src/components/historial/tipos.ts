/**
 * Lo que los componentes del historial necesitan de cada torneo jugado.
 * Es un subconjunto de `TorneoDelHistorial` (el servicio UC-38): los
 * componentes no importan de `services`, así que el contrato vive acá y
 * TypeScript verifica que lo que devuelve el servicio lo cumpla.
 */
export interface TorneoJugado {
  torneoId: string;
  torneoNombre: string;
  modalidad: string;
  ciudadNombre: string | null;
  fechaInicio: string | null;
  equipoId: string;
  equipoNombre: string;
  partidosJugados: number;
  goles: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  vecesJugadorDelPartido: number;
}
