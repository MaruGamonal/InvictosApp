import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Contexto } from './contexto';

interface Fixture {
  rolesEnEquipo?: Record<string, string[]>; // `${perfilId}:${equipoId}` -> roles
  rolEnOrganizacion?: Record<string, 'owner' | 'admin'>; // `${usuarioId}:${organizacionId}`
  colaboradorActivo?: Record<string, boolean>; // `${usuarioId}:${torneoId}`
  organizacionDelTorneo?: Record<string, string>; // torneoId -> organizacionId
  capitanDelEquipo?: Record<string, string>; // equipoId -> perfilId
}

function mockearPool(fixture: Fixture) {
  vi.doMock('@/db/cliente', () => ({
    obtenerPool: () => ({
      query: async (texto: string, valores: unknown[] = []) => {
        const sql = texto.toUpperCase();
        if (sql.includes('FROM INTEGRANTE_EQUIPO')) {
          const [perfilId, equipoId] = valores as [string, string];
          const roles = fixture.rolesEnEquipo?.[`${perfilId}:${equipoId}`] ?? [];
          return { rows: roles.map((rol_equipo) => ({ rol_equipo })) };
        }
        if (sql.includes('FROM MIEMBRO_ORGANIZACION')) {
          const [usuarioId, organizacionId] = valores as [string, string];
          const rol = fixture.rolEnOrganizacion?.[`${usuarioId}:${organizacionId}`];
          return { rows: rol ? [{ rol }] : [] };
        }
        if (sql.includes('FROM COLABORADOR_TORNEO')) {
          const [usuarioId, torneoId] = valores as [string, string];
          return { rows: fixture.colaboradorActivo?.[`${usuarioId}:${torneoId}`] ? [{}] : [] };
        }
        if (sql.includes('FROM TORNEO WHERE ID')) {
          const [torneoId] = valores as [string];
          const organizacion_id = fixture.organizacionDelTorneo?.[torneoId];
          return { rows: organizacion_id ? [{ organizacion_id }] : [] };
        }
        if (sql.includes('FROM EQUIPO WHERE ID')) {
          const [equipoId] = valores as [string];
          const perfil_capitan_id = fixture.capitanDelEquipo?.[equipoId];
          return { rows: perfil_capitan_id ? [{ perfil_capitan_id }] : [] };
        }
        throw new Error(`consulta no prevista en el mock: ${texto}`);
      },
    }),
  }));
}

const contextoDe = (usuarioId: string | null, esSistema = false): Contexto => ({
  usuarioId,
  permisos: {},
  esSistema,
});

beforeEach(() => {
  vi.resetModules();
});

describe('verificarPermisoOrganizacion', () => {
  it('el Titular puede todo, incluida la gestión de administradores', async () => {
    mockearPool({ rolEnOrganizacion: { 'titular:org-1': 'owner' } });
    const { verificarPermisoOrganizacion } = await import('./permisos');
    await expect(
      verificarPermisoOrganizacion(contextoDe('titular'), 'org-1', 'gestionar_administradores'),
    ).resolves.toBeUndefined();
  });

  it('un Administrador no puede crear ni quitar Administradores', async () => {
    mockearPool({ rolEnOrganizacion: { 'admin-1:org-1': 'admin' } });
    const { verificarPermisoOrganizacion } = await import('./permisos');
    await expect(
      verificarPermisoOrganizacion(contextoDe('admin-1'), 'org-1', 'gestionar_administradores'),
    ).rejects.toMatchObject({ codigo: 'ADMIN_NO_PUEDE_GESTIONAR_ADMINS' });
  });

  it('un Administrador no puede transferir la titularidad', async () => {
    mockearPool({ rolEnOrganizacion: { 'admin-1:org-1': 'admin' } });
    const { verificarPermisoOrganizacion } = await import('./permisos');
    await expect(
      verificarPermisoOrganizacion(contextoDe('admin-1'), 'org-1', 'transferir_titularidad'),
    ).rejects.toMatchObject({ codigo: 'ROL_TITULAR_NO_GESTIONABLE' });
  });

  it('un Administrador sí puede gestionar torneos y colaboradores', async () => {
    mockearPool({ rolEnOrganizacion: { 'admin-1:org-1': 'admin' } });
    const { verificarPermisoOrganizacion } = await import('./permisos');
    await expect(
      verificarPermisoOrganizacion(contextoDe('admin-1'), 'org-1', 'gestionar_torneos'),
    ).resolves.toBeUndefined();
  });

  it('alguien sin ningún rol en la organización recibe SIN_PERMISO', async () => {
    mockearPool({});
    const { verificarPermisoOrganizacion } = await import('./permisos');
    await expect(
      verificarPermisoOrganizacion(contextoDe('cualquiera'), 'org-1', 'gestionar_torneos'),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('sin sesión, NO_AUTENTICADO', async () => {
    mockearPool({});
    const { verificarPermisoOrganizacion } = await import('./permisos');
    await expect(
      verificarPermisoOrganizacion(contextoDe(null), 'org-1', 'gestionar_torneos'),
    ).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
  });

  it('un contexto de sistema (tareas programadas) pasa siempre', async () => {
    mockearPool({});
    const { verificarPermisoOrganizacion } = await import('./permisos');
    await expect(
      verificarPermisoOrganizacion(contextoDe(null, true), 'org-1', 'gestionar_administradores'),
    ).resolves.toBeUndefined();
  });
});

describe('verificarPermisoTorneo', () => {
  it('un colaborador asignado al torneo A no puede cargar un resultado del torneo B de la misma organización', async () => {
    mockearPool({
      organizacionDelTorneo: { 'torneo-a': 'org-1', 'torneo-b': 'org-1' },
      colaboradorActivo: { 'colab-1:torneo-a': true },
    });
    const { verificarPermisoTorneo } = await import('./permisos');

    await expect(
      verificarPermisoTorneo(contextoDe('colab-1'), 'torneo-a', 'cargar_resultados'),
    ).resolves.toBeUndefined();
    await expect(
      verificarPermisoTorneo(contextoDe('colab-1'), 'torneo-b', 'cargar_resultados'),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('un colaborador asignado a un torneo no puede resolver inscripciones de ese mismo torneo', async () => {
    mockearPool({
      organizacionDelTorneo: { 'torneo-a': 'org-1' },
      colaboradorActivo: { 'colab-1:torneo-a': true },
    });
    const { verificarPermisoTorneo } = await import('./permisos');

    await expect(
      verificarPermisoTorneo(contextoDe('colab-1'), 'torneo-a', 'resolver_inscripciones'),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('el Administrador de la organización puede todo en cualquier torneo suyo', async () => {
    mockearPool({
      organizacionDelTorneo: { 'torneo-a': 'org-1' },
      rolEnOrganizacion: { 'admin-1:org-1': 'admin' },
    });
    const { verificarPermisoTorneo } = await import('./permisos');
    await expect(
      verificarPermisoTorneo(contextoDe('admin-1'), 'torneo-a', 'resolver_inscripciones'),
    ).resolves.toBeUndefined();
  });

  it('un torneo inexistente da NO_ENCONTRADO', async () => {
    mockearPool({});
    const { verificarPermisoTorneo } = await import('./permisos');
    await expect(
      verificarPermisoTorneo(contextoDe('quien-sea'), 'no-existe', 'cargar_resultados'),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });
});

describe('verificarPermisoEquipo', () => {
  it('un integrante con rol coach no puede gestionar el plantel', async () => {
    mockearPool({ rolesEnEquipo: { 'perfil-dt:equipo-1': ['coach'] } });
    const { verificarPermisoEquipo } = await import('./permisos');
    await expect(
      verificarPermisoEquipo(
        contextoDe('usuario-dt'),
        'perfil-dt',
        'equipo-1',
        'gestionar_plantel',
      ),
    ).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });

  it('el capitán sí puede gestionar el plantel', async () => {
    mockearPool({ rolesEnEquipo: { 'perfil-cap:equipo-1': ['captain'] } });
    const { verificarPermisoEquipo } = await import('./permisos');
    await expect(
      verificarPermisoEquipo(
        contextoDe('usuario-cap'),
        'perfil-cap',
        'equipo-1',
        'gestionar_plantel',
      ),
    ).resolves.toBeUndefined();
  });
});

describe('verificarPuedeDejarEquipo', () => {
  it('el capitán único no puede dejar el equipo sin designar reemplazo', async () => {
    mockearPool({ capitanDelEquipo: { 'equipo-1': 'perfil-cap' } });
    const { verificarPuedeDejarEquipo } = await import('./permisos');
    await expect(verificarPuedeDejarEquipo('equipo-1', 'perfil-cap')).rejects.toMatchObject({
      codigo: 'CAPITAN_SIN_REEMPLAZO',
    });
  });

  it('cualquier otro integrante puede irse sin restricción', async () => {
    mockearPool({ capitanDelEquipo: { 'equipo-1': 'perfil-cap' } });
    const { verificarPuedeDejarEquipo } = await import('./permisos');
    await expect(verificarPuedeDejarEquipo('equipo-1', 'perfil-jugador')).resolves.toBeUndefined();
  });
});

describe('verificarPuedeVerTorneo', () => {
  it('un torneo en draft de una organización ajena da NO_ENCONTRADO, no SIN_PERMISO', async () => {
    mockearPool({});
    const { verificarPuedeVerTorneo } = await import('./permisos');
    await expect(
      verificarPuedeVerTorneo(contextoDe('cualquiera'), {
        id: 'torneo-1',
        organizacionId: 'org-ajena',
        estado: 'draft',
      }),
    ).rejects.toMatchObject({ codigo: 'NO_ENCONTRADO' });
  });

  it('un torneo publicado es visible para cualquiera', async () => {
    mockearPool({});
    const { verificarPuedeVerTorneo } = await import('./permisos');
    await expect(
      verificarPuedeVerTorneo(contextoDe(null), {
        id: 'torneo-1',
        organizacionId: 'org-1',
        estado: 'registration_open',
      }),
    ).resolves.toBeUndefined();
  });

  it('el dueño de la organización sí ve su propio torneo en draft', async () => {
    mockearPool({ rolEnOrganizacion: { 'titular:org-1': 'owner' } });
    const { verificarPuedeVerTorneo } = await import('./permisos');
    await expect(
      verificarPuedeVerTorneo(contextoDe('titular'), {
        id: 'torneo-1',
        organizacionId: 'org-1',
        estado: 'draft',
      }),
    ).resolves.toBeUndefined();
  });
});
