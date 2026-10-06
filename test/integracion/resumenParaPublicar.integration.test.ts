import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { crearOrganizacion } from '@/services/organizadores/crearOrganizacion';
import { crearTorneo } from '@/services/torneos/crearTorneo';
import { obtenerResumenParaPublicar } from '@/services/torneos/obtenerResumenParaPublicar';
import { crearCiudadDePrueba, crearUsuarioDePrueba } from './_escenarios';

/**
 * `obtenerResumenParaPublicar` arma su SELECT con los nombres de columna
 * de `CAMPOS_MINIMOS`, la misma lista que valida `publicarTorneo`. Eso
 * es lo que mantiene las dos pantallas de acuerdo, pero también
 * convierte un nombre de columna equivocado en un error de SQL que
 * ningún test con la base simulada puede ver: el mock responde a
 * cualquier consulta.
 */
describe('el resumen para publicar contra el esquema real', () => {
  it('dice qué datos mínimos faltan, con el nombre que tienen en pantalla', async () => {
    const titular = await crearUsuarioDePrueba('Organizadora de prueba');
    const ciudadId = await crearCiudadDePrueba();
    const organizacion = await crearOrganizacion(
      { nombre: `Organización de prueba ${randomUUID()}`, ciudadId },
      titular.contexto,
    );

    // Sin dirección ni fecha de inicio: dos de los datos mínimos.
    const torneo = await crearTorneo(
      {
        organizacionId: organizacion.id,
        nombre: `Torneo de prueba ${randomUUID()}`,
        modalidad: 'f5',
        categoriaGenero: 'mixed',
        ciudadId,
        formato: 'league',
        cupoEquipos: 8,
      },
      titular.contexto,
    );

    const resumen = await obtenerResumenParaPublicar({ torneoId: torneo.id }, titular.contexto);

    expect(resumen.torneoEstado).toBe('draft');
    expect(resumen.camposFaltantes).toContain('dirección');
    expect(resumen.camposFaltantes).toContain('fecha estimada de inicio');
    expect(resumen.camposFaltantes).not.toContain('nombre');
  });

  it('con todo cargado, no falta nada', async () => {
    const titular = await crearUsuarioDePrueba('Organizadora de prueba');
    const ciudadId = await crearCiudadDePrueba();
    const organizacion = await crearOrganizacion(
      { nombre: `Organización de prueba ${randomUUID()}`, ciudadId },
      titular.contexto,
    );
    const torneo = await crearTorneo(
      {
        organizacionId: organizacion.id,
        nombre: `Torneo de prueba ${randomUUID()}`,
        modalidad: 'f5',
        categoriaGenero: 'mixed',
        ciudadId,
        direccion: 'Cancha de prueba 123',
        fechaInicioEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        formato: 'league',
        cupoEquipos: 8,
      },
      titular.contexto,
    );

    const resumen = await obtenerResumenParaPublicar({ torneoId: torneo.id }, titular.contexto);
    expect(resumen.camposFaltantes).toEqual([]);

    // Y lo que dice la pantalla coincide con lo que acepta el servicio
    // que publica: ninguna de las columnas mínimas quedó en null.
    const { rows } = await obtenerPool().query<{ faltan: string }>(
      `SELECT count(*) AS faltan FROM torneo
       WHERE id = $1 AND (nombre IS NULL OR modalidad IS NULL OR formato IS NULL
         OR ciudad_id IS NULL OR direccion IS NULL OR fecha_inicio_estimada IS NULL
         OR cupo_equipos IS NULL)`,
      [torneo.id],
    );
    expect(Number(rows[0]!.faltan)).toBe(0);
  });
});
