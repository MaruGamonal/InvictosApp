import { describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import { CONTEXTO_PUBLICO } from '@/lib/contexto';
import { ajustarPuntos } from '@/services/posiciones/ajustarPuntos';
import { obtenerTabla } from '@/services/posiciones/obtenerTabla';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import { obtenerGestionTorneo } from '@/services/torneos/obtenerGestionTorneo';
import { crearTorneoDePrueba, inscribirEquipos, generarYConfirmarFixture } from './_escenarios';

/**
 * UC-35 / D-35b — La quita de puntos del organizador.
 *
 * `posicion.ajuste_puntos` está en el esquema desde el principio y la
 * tabla **ya lo suma** al ordenar y al mostrar. `ajustarPuntos` existía
 * y estaba probado. Lo único que faltaba era quien lo escribiera:
 * ninguna ruta ni pantalla lo alcanzaba.
 *
 * Lo que se verifica acá y no se puede con la base simulada: que la
 * sanción efectivamente mueva al equipo en la tabla, y que `puntos` y
 * `ajuste_puntos` queden separados — que es lo que mantiene la tabla
 * explicable.
 */
describe('el ajuste de puntos', () => {
  it('resta en la tabla sin tocar los puntos ganados en la cancha', async () => {
    const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 4 });
    const equipos = await inscribirEquipos(escenario, 4);
    await generarYConfirmarFixture(escenario);

    const pool = obtenerPool();
    const { rows: partidos } = await pool.query<{
      id: string;
      equipo_local_id: string;
      grupo_id: string;
    }>('SELECT id, equipo_local_id, grupo_id FROM partido WHERE torneo_id = $1 LIMIT 1', [
      escenario.torneoId,
    ]);
    const partido = partidos[0]!;

    // El local gana 3-0: tres puntos ganados en la cancha.
    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    const version = gestion.partidos.find((p) => p.id === partido.id)!.version;
    await cargarResultado(
      { partidoId: partido.id, version, golesLocal: 3, golesVisitante: 0 },
      escenario.titular.contexto,
    );

    const [antes] = await obtenerTabla({ grupoId: partido.grupo_id }, CONTEXTO_PUBLICO);
    const ganadorAntes = antes!.filas.find((f) => f.equipoId === partido.equipo_local_id)!;
    expect(ganadorAntes.puntos).toBe(3);
    expect(ganadorAntes.ajustePuntos).toBe(0);
    expect(antes!.filas[0]!.equipoId).toBe(partido.equipo_local_id);

    await ajustarPuntos(
      {
        torneoId: escenario.torneoId,
        equipoId: partido.equipo_local_id,
        ajuste: -5,
        motivo: 'Presentó un jugador no habilitado',
      },
      escenario.titular.contexto,
    );

    const [despues] = await obtenerTabla({ grupoId: partido.grupo_id }, CONTEXTO_PUBLICO);
    const ganadorDespues = despues!.filas.find((f) => f.equipoId === partido.equipo_local_id)!;
    // Los puntos de la cancha no se tocan: es lo que mantiene explicable
    // de dónde sale cada número.
    expect(ganadorDespues.puntos).toBe(3);
    expect(ganadorDespues.ajustePuntos).toBe(-5);
    // Y con 3 − 5 = −2 deja de estar primero.
    expect(despues!.filas[0]!.equipoId).not.toBe(partido.equipo_local_id);
    expect(despues!.filas[despues!.filas.length - 1]!.equipoId).toBe(partido.equipo_local_id);

    // El motivo queda guardado: una sanción sin explicación no se puede
    // defender cuando la discuten.
    const gestionDespues = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    const inscripcion = gestionDespues.inscripciones.find(
      (i) => i.equipoId === partido.equipo_local_id,
    )!;
    expect(inscripcion).toMatchObject({
      tieneTabla: true,
      ajustePuntos: -5,
      ultimoAjusteMotivo: 'Presentó un jugador no habilitado',
    });

    // Y se acumula, no se reemplaza: dos fechas con una quita de 1 son −2.
    await ajustarPuntos(
      {
        torneoId: escenario.torneoId,
        equipoId: partido.equipo_local_id,
        ajuste: 2,
        motivo: 'Apelación aceptada',
      },
      escenario.titular.contexto,
    );
    const [final] = await obtenerTabla({ grupoId: partido.grupo_id }, CONTEXTO_PUBLICO);
    expect(final!.filas.find((f) => f.equipoId === partido.equipo_local_id)!.ajustePuntos).toBe(-3);
  });

  /** Sin fixture confirmado el equipo no tiene grupo, y el ajuste no tendría dónde guardarse. */
  it('sin tabla asignada, no se puede ajustar', async () => {
    const escenario = await crearTorneoDePrueba({ cupoEquipos: 4 });
    const [primero] = await inscribirEquipos(escenario, 1);

    const gestion = await obtenerGestionTorneo(
      { torneoId: escenario.torneoId },
      escenario.titular.contexto,
    );
    expect(gestion.inscripciones[0]!.tieneTabla).toBe(false);

    await expect(
      ajustarPuntos(
        {
          torneoId: escenario.torneoId,
          equipoId: primero!.equipoId,
          ajuste: -1,
          motivo: 'Lo que sea',
        },
        escenario.titular.contexto,
      ),
    ).rejects.toMatchObject({ codigo: 'DATOS_INVALIDOS' });
  });
});
