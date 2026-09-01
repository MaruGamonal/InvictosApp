import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { obtenerPool } from '@/db/cliente';
import {
  verificarPermisoOrganizacion,
  verificarPermisoTorneo,
  verificarPermisoEquipo,
  type AccionOrganizacion,
  type AccionTorneo,
  type AccionEquipo,
} from '@/lib/permisos';
import { crearEquipo } from '@/services/equipos/crearEquipo';
import { crearUsuarioDePrueba, crearTorneoDePrueba, type UsuarioDePrueba } from './_escenarios';

/**
 * T27 — La matriz de los tres vínculos (`10`, 2.3) contra las
 * operaciones del sistema, resuelta contra Postgres real: es lo que
 * garantiza que la función compartida no se degrade cuando se agregue
 * una capacidad nueva. Si un cambio le da a un Colaborador (o a
 * cualquier otro rol) una capacidad que no le corresponde, el test
 * parametrizado que la nombra es el que falla.
 */

async function agregarMiembro(
  organizacionId: string,
  usuarioId: string,
  rol: 'owner' | 'admin',
): Promise<void> {
  await obtenerPool().query(
    `INSERT INTO miembro_organizacion (organizacion_id, usuario_id, rol) VALUES ($1, $2, $3)`,
    [organizacionId, usuarioId, rol],
  );
}

async function agregarColaborador(torneoId: string, usuarioId: string): Promise<void> {
  await obtenerPool().query(
    `INSERT INTO colaborador_torneo (torneo_id, usuario_id, estado, asignado_por_usuario_id)
     VALUES ($1, $2, 'active', $2)`,
    [torneoId, usuarioId],
  );
}

async function agregarIntegranteEquipo(
  equipoId: string,
  perfilId: string,
  rol: 'captain' | 'delegate' | 'player' | 'coach',
): Promise<void> {
  await obtenerPool().query(
    `INSERT INTO integrante_equipo (equipo_id, perfil_id, rol_equipo, estado_vinculo, fecha_incorporacion)
     VALUES ($1, $2, $3, 'active', now())`,
    [equipoId, perfilId, rol],
  );
}

describe('matriz de permisos contra Postgres real (T4)', () => {
  afterAll(async () => {
    await obtenerPool().end();
  });

  describe('organización', () => {
    const TODAS: AccionOrganizacion[] = [
      'actualizar_organizacion',
      'solicitar_verificacion',
      'gestionar_torneos',
      'gestionar_colaboradores',
      'gestionar_administradores',
      'transferir_titularidad',
    ];
    const DE_ADMINISTRADOR: AccionOrganizacion[] = [
      'actualizar_organizacion',
      'gestionar_torneos',
      'gestionar_colaboradores',
    ];

    it.each(TODAS)('el Titular puede %s', async (accion) => {
      const escenario = await crearTorneoDePrueba();
      await expect(
        verificarPermisoOrganizacion(escenario.titular.contexto, escenario.organizacionId, accion),
      ).resolves.toBeUndefined();
    });

    it.each(DE_ADMINISTRADOR)('el Administrador puede %s', async (accion) => {
      const escenario = await crearTorneoDePrueba();
      const admin = await crearUsuarioDePrueba();
      await agregarMiembro(escenario.organizacionId, admin.usuarioId, 'admin');
      await expect(
        verificarPermisoOrganizacion(admin.contexto, escenario.organizacionId, accion),
      ).resolves.toBeUndefined();
    });

    it.each(TODAS.filter((a) => !DE_ADMINISTRADOR.includes(a)))(
      'el Administrador NO puede %s',
      async (accion) => {
        const escenario = await crearTorneoDePrueba();
        const admin = await crearUsuarioDePrueba();
        await agregarMiembro(escenario.organizacionId, admin.usuarioId, 'admin');
        await expect(
          verificarPermisoOrganizacion(admin.contexto, escenario.organizacionId, accion),
        ).rejects.toBeInstanceOf(Error);
      },
    );

    it('alguien sin vínculo con la organización no puede nada: SIN_PERMISO', async () => {
      const escenario = await crearTorneoDePrueba();
      const desconocido = await crearUsuarioDePrueba();
      await expect(
        verificarPermisoOrganizacion(
          desconocido.contexto,
          escenario.organizacionId,
          'actualizar_organizacion',
        ),
      ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    });
  });

  describe('torneo', () => {
    const TODAS: AccionTorneo[] = [
      'configurar_torneo',
      'resolver_inscripciones',
      'asignar_colaboradores',
      'cargar_resultados',
      'programar_partidos',
      'registrar_no_disputados',
    ];
    const DE_COLABORADOR: AccionTorneo[] = [
      'cargar_resultados',
      'programar_partidos',
      'registrar_no_disputados',
    ];

    it.each(TODAS)(
      'el Titular de la organización puede %s en cualquiera de sus torneos',
      async (accion) => {
        const escenario = await crearTorneoDePrueba();
        await expect(
          verificarPermisoTorneo(escenario.titular.contexto, escenario.torneoId, accion),
        ).resolves.toBeUndefined();
      },
    );

    it.each(DE_COLABORADOR)('un Colaborador asignado a ese torneo puede %s', async (accion) => {
      const escenario = await crearTorneoDePrueba();
      const colaborador = await crearUsuarioDePrueba();
      await agregarColaborador(escenario.torneoId, colaborador.usuarioId);
      await expect(
        verificarPermisoTorneo(colaborador.contexto, escenario.torneoId, accion),
      ).resolves.toBeUndefined();
    });

    it.each(TODAS.filter((a) => !DE_COLABORADOR.includes(a)))(
      'un Colaborador NO puede %s — no es una de las tres acciones fijas de `06`, D-32',
      async (accion) => {
        const escenario = await crearTorneoDePrueba();
        const colaborador = await crearUsuarioDePrueba();
        await agregarColaborador(escenario.torneoId, colaborador.usuarioId);
        await expect(
          verificarPermisoTorneo(colaborador.contexto, escenario.torneoId, accion),
        ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
      },
    );

    it('un Colaborador asignado a OTRO torneo no puede actuar en este, aunque sea de la misma organización', async () => {
      const escenario = await crearTorneoDePrueba();
      const otroTorneo = await crearTorneoDePrueba();
      const colaborador = await crearUsuarioDePrueba();
      await agregarColaborador(otroTorneo.torneoId, colaborador.usuarioId);
      await expect(
        verificarPermisoTorneo(colaborador.contexto, escenario.torneoId, 'cargar_resultados'),
      ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    });
  });

  describe('equipo', () => {
    interface EquipoConRoles {
      equipoId: string;
      capitan: UsuarioDePrueba;
      delegado: UsuarioDePrueba;
      jugador: UsuarioDePrueba;
      dt: UsuarioDePrueba;
    }

    async function crearEquipoConRoles(): Promise<EquipoConRoles> {
      const capitan = await crearUsuarioDePrueba('Capitán');
      const equipo = await crearEquipo(
        { nombre: `Equipo de prueba ${randomUUID()}`, categoriaGenero: 'mixed' },
        capitan.contexto,
      );
      const delegado = await crearUsuarioDePrueba('Delegado');
      const jugador = await crearUsuarioDePrueba('Jugador');
      const dt = await crearUsuarioDePrueba('DT');
      await agregarIntegranteEquipo(equipo.id, delegado.perfilId, 'delegate');
      await agregarIntegranteEquipo(equipo.id, jugador.perfilId, 'player');
      await agregarIntegranteEquipo(equipo.id, dt.perfilId, 'coach');
      return { equipoId: equipo.id, capitan, delegado, jugador, dt };
    }

    const ACCIONES: AccionEquipo[] = [
      'gestionar_plantel',
      'inscribir_a_torneo',
      'accion_de_capitan',
    ];

    it('el Capitán puede las tres acciones del equipo', async () => {
      const { equipoId, capitan } = await crearEquipoConRoles();
      for (const accion of ACCIONES) {
        await expect(
          verificarPermisoEquipo(capitan.contexto, capitan.perfilId, equipoId, accion),
        ).resolves.toBeUndefined();
      }
    });

    it('el Delegado gestiona el plantel y las inscripciones, pero NO tiene accion_de_capitan', async () => {
      const { equipoId, delegado } = await crearEquipoConRoles();
      await expect(
        verificarPermisoEquipo(delegado.contexto, delegado.perfilId, equipoId, 'gestionar_plantel'),
      ).resolves.toBeUndefined();
      await expect(
        verificarPermisoEquipo(delegado.contexto, delegado.perfilId, equipoId, 'accion_de_capitan'),
      ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
    });

    it.each(['jugador', 'dt'] as const)(
      'el %s no gestiona el plantel ni tiene accion_de_capitan — el rol deportivo no es administrativo (`06`, D-25)',
      async (rol) => {
        const escenario = await crearEquipoConRoles();
        const persona = rol === 'jugador' ? escenario.jugador : escenario.dt;
        await expect(
          verificarPermisoEquipo(
            persona.contexto,
            persona.perfilId,
            escenario.equipoId,
            'gestionar_plantel',
          ),
        ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
        await expect(
          verificarPermisoEquipo(
            persona.contexto,
            persona.perfilId,
            escenario.equipoId,
            'accion_de_capitan',
          ),
        ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
      },
    );
  });
});
