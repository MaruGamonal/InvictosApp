import { obtenerPool } from '@/db/cliente';
import { DOMINIO_DEMO, hayCredencialesDeAuth } from './_identidad';

/**
 * Borra **solo** los datos demo, respetando el orden de dependencias.
 *
 * Qué cuenta como demo, y por qué es seguro: todo lo que siembra
 * `sembrar.ts` queda marcado en origen —las cuentas con el dominio
 * `@demo.invicta.com.ar`, y organizaciones/torneos/equipos/certámenes
 * con el prefijo `[DEMO]`—, así que el criterio de borrado no adivina
 * nada. Cualquier fila que no lleve esas marcas se queda donde está:
 * el script imprime cuántas sobreviven antes de tocar la base, para que
 * eso se pueda verificar a ojo en vez de confiar.
 *
 * El catálogo (`provincia`, `ciudad`) nunca se toca: no es dato de
 * prueba, lo carga una migración.
 *
 * Correrlo:
 *   npm run demo:limpiar -- --confirmar
 */

const EMAIL_DEMO = `%@${DOMINIO_DEMO}`;
/** El seed anterior usaba este dominio; se limpia también para no dejarlo colgado. */
const EMAIL_DEMO_LEGACY = '%@demo.invicta.local';
const PREFIJO_DEMO = '%[DEMO]%';

interface IdsDemo {
  torneoIds: string[];
  equipoIds: string[];
  usuarioIds: string[];
  organizacionIds: string[];
  perfilIds: string[];
}

/**
 * Orden hijos → padres. Cada paso declara exactamente los parámetros que
 * usa: Postgres rechaza un bind con más parámetros que placeholders, así
 * que no se puede mandar la misma tupla a todos.
 */
const PASOS: Array<{ etiqueta: string; sql: string; params: (ids: IdsDemo) => unknown[] }> = [
  {
    etiqueta: 'evento_partido',
    sql: `DELETE FROM evento_partido WHERE partido_id IN (SELECT id FROM partido WHERE torneo_id = ANY($1))`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'disputa_resultado',
    sql: `DELETE FROM disputa_resultado WHERE partido_id IN (SELECT id FROM partido WHERE torneo_id = ANY($1))`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'estadistica_jugador',
    sql: `DELETE FROM estadistica_jugador WHERE torneo_id = ANY($1)`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'posicion',
    sql: `DELETE FROM posicion WHERE grupo_id IN (SELECT g.id FROM grupo g JOIN fase f ON f.id = g.fase_id WHERE f.torneo_id = ANY($1))`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'partido',
    sql: `DELETE FROM partido WHERE torneo_id = ANY($1)`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'integrante_habilitado',
    sql: `DELETE FROM integrante_habilitado WHERE torneo_id = ANY($1) OR equipo_id = ANY($2)`,
    params: (i) => [i.torneoIds, i.equipoIds],
  },
  // Antes que `grupo`: `inscripcion.grupo_id` apunta a la zona asignada.
  {
    etiqueta: 'inscripcion',
    sql: `DELETE FROM inscripcion WHERE torneo_id = ANY($1) OR equipo_id = ANY($2)`,
    params: (i) => [i.torneoIds, i.equipoIds],
  },
  {
    etiqueta: 'grupo',
    sql: `DELETE FROM grupo WHERE fase_id IN (SELECT id FROM fase WHERE torneo_id = ANY($1))`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'fase',
    sql: `DELETE FROM fase WHERE torneo_id = ANY($1)`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'reglamento',
    sql: `DELETE FROM reglamento WHERE torneo_id = ANY($1)`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'colaborador_torneo',
    sql: `DELETE FROM colaborador_torneo WHERE torneo_id = ANY($1) OR usuario_id = ANY($2)`,
    params: (i) => [i.torneoIds, i.usuarioIds],
  },
  {
    etiqueta: 'torneo',
    sql: `DELETE FROM torneo WHERE id = ANY($1)`,
    params: (i) => [i.torneoIds],
  },
  {
    etiqueta: 'certamen',
    sql: `DELETE FROM certamen WHERE organizacion_id = ANY($1) OR nombre LIKE '%[DEMO]%'`,
    params: (i) => [i.organizacionIds],
  },
  {
    etiqueta: 'sede',
    sql: `DELETE FROM sede WHERE organizacion_id = ANY($1)`,
    params: (i) => [i.organizacionIds],
  },
  {
    etiqueta: 'miembro_organizacion',
    sql: `DELETE FROM miembro_organizacion WHERE organizacion_id = ANY($1) OR usuario_id = ANY($2)`,
    params: (i) => [i.organizacionIds, i.usuarioIds],
  },
  {
    etiqueta: 'organizacion',
    sql: `DELETE FROM organizacion WHERE id = ANY($1)`,
    params: (i) => [i.organizacionIds],
  },
  {
    etiqueta: 'score_equipo',
    sql: `DELETE FROM score_equipo WHERE equipo_id = ANY($1)`,
    params: (i) => [i.equipoIds],
  },
  {
    etiqueta: 'integrante_equipo',
    sql: `DELETE FROM integrante_equipo WHERE equipo_id = ANY($1) OR perfil_id = ANY($2)`,
    params: (i) => [i.equipoIds, i.perfilIds],
  },
  {
    etiqueta: 'equipo',
    sql: `DELETE FROM equipo WHERE id = ANY($1)`,
    params: (i) => [i.equipoIds],
  },
  {
    etiqueta: 'seguimiento',
    sql: `DELETE FROM seguimiento WHERE usuario_id = ANY($1) OR entidad_seguida_id = ANY($2) OR entidad_seguida_id = ANY($3)`,
    params: (i) => [i.usuarioIds, i.torneoIds, i.equipoIds],
  },
  {
    etiqueta: 'notificacion',
    sql: `DELETE FROM notificacion WHERE usuario_id = ANY($1)`,
    params: (i) => [i.usuarioIds],
  },
  {
    etiqueta: 'preferencia_notificacion',
    sql: `DELETE FROM preferencia_notificacion WHERE usuario_id = ANY($1)`,
    params: (i) => [i.usuarioIds],
  },
  // `usuario` apunta a su propio perfil: hay que soltar la referencia antes de borrar el perfil.
  {
    etiqueta: 'usuario.perfil_deportivo_id → null',
    sql: `UPDATE usuario SET perfil_deportivo_id = NULL WHERE id = ANY($1)`,
    params: (i) => [i.usuarioIds],
  },
  {
    etiqueta: 'perfil_deportivo',
    sql: `DELETE FROM perfil_deportivo WHERE id = ANY($1)`,
    params: (i) => [i.perfilIds],
  },
  {
    etiqueta: 'usuario',
    sql: `DELETE FROM usuario WHERE id = ANY($1)`,
    params: (i) => [i.usuarioIds],
  },
];

/**
 * Qué es demo, en orden: primero las cuentas (por dominio), y con eso
 * todo lo que esas cuentas crearon. El prefijo `[DEMO]` no alcanza solo:
 * la aplicación genera nombres por su cuenta —`asegurarOrganizacionPropia`
 * crea "Torneos de {nombre}" al crear el primer torneo— y esas filas son
 * igual de demo aunque no lleven la marca. Colgarlas de la cuenta que las
 * creó es lo que evita dejarlas huérfanas.
 */
async function idsDemo(): Promise<IdsDemo> {
  const pool = obtenerPool();
  const uno = async (sql: string, params: unknown[] = []) =>
    (await pool.query<{ id: string }>(sql, params)).rows.map((fila) => fila.id);

  const usuarioIds = await uno(`SELECT id FROM usuario WHERE email LIKE $1 OR email LIKE $2`, [
    EMAIL_DEMO,
    EMAIL_DEMO_LEGACY,
  ]);
  const organizacionIds = await uno(
    `SELECT id FROM organizacion WHERE nombre LIKE $1 OR usuario_titular_id = ANY($2)`,
    [PREFIJO_DEMO, usuarioIds],
  );
  const torneoIds = await uno(
    `SELECT id FROM torneo WHERE nombre LIKE $1 OR organizacion_id = ANY($2)`,
    [PREFIJO_DEMO, organizacionIds],
  );
  const equipoIds = await uno(
    `SELECT id FROM equipo WHERE nombre LIKE $1 OR creado_por_usuario_id = ANY($2)`,
    [PREFIJO_DEMO, usuarioIds],
  );
  // Incluye los perfiles sin cuenta que creó un capitán demo al armar su plantel.
  const perfilIds = await uno(
    `SELECT id FROM perfil_deportivo WHERE usuario_id = ANY($1) OR creado_por_usuario_id = ANY($1)`,
    [usuarioIds],
  );

  return { torneoIds, equipoIds, usuarioIds, organizacionIds, perfilIds };
}

/**
 * Lo que queda en pie, contado contra los mismos ids que se van a borrar
 * —no por nombre—. Contar por nombre daba un número engañoso: una
 * organización que la aplicación bautizó sola ("Torneos de …") no lleva
 * el prefijo pero sí es demo, y aparecía como sobreviviente cuando en
 * realidad estaba en la lista de borrado.
 */
async function contarSobrevivientes(ids: IdsDemo) {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ entidad: string; cantidad: string }>(
    `SELECT 'usuario' AS entidad, count(*)::text AS cantidad FROM usuario WHERE NOT (id = ANY($1))
     UNION ALL SELECT 'torneo', count(*)::text FROM torneo WHERE NOT (id = ANY($2))
     UNION ALL SELECT 'equipo', count(*)::text FROM equipo WHERE NOT (id = ANY($3))
     UNION ALL SELECT 'organizacion', count(*)::text FROM organizacion WHERE NOT (id = ANY($4))`,
    [ids.usuarioIds, ids.torneoIds, ids.equipoIds, ids.organizacionIds],
  );
  return rows;
}

/** Las cuentas de Supabase Auth no viven en esta base: se borran por separado, si hay credenciales. */
async function borrarCuentasDeAuth(usuarioIds: string[]): Promise<number> {
  if (!hayCredencialesDeAuth() || usuarioIds.length === 0) return 0;
  const { obtenerClienteAdmin } = await import('@/lib/supabase/admin');
  const admin = obtenerClienteAdmin();
  let borradas = 0;
  for (const usuarioId of usuarioIds) {
    const { error } = await admin.auth.admin.deleteUser(usuarioId);
    // Un "not found" es lo esperable para las cuentas del seed viejo, que
    // solo existían como fila en Postgres: no es un fallo de este paso.
    if (!error) borradas += 1;
  }
  return borradas;
}

export async function limpiarDemo(): Promise<void> {
  const pool = obtenerPool();
  const objetivo = await idsDemo();

  console.log('A borrar (marcados como demo):');
  console.log(`  usuarios: ${objetivo.usuarioIds.length}`);
  console.log(`  perfiles: ${objetivo.perfilIds.length}`);
  console.log(`  organizaciones: ${objetivo.organizacionIds.length}`);
  console.log(`  torneos: ${objetivo.torneoIds.length}`);
  console.log(`  equipos: ${objetivo.equipoIds.length}`);

  console.log('\nSe conservan (todo lo que no es demo):');
  for (const fila of await contarSobrevivientes(objetivo)) {
    console.log(`  ${fila.entidad}: ${fila.cantidad}`);
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    console.log('\nBorrando:');
    for (const paso of PASOS) {
      const { rowCount } = await cliente.query(paso.sql, paso.params(objetivo));
      if (rowCount) console.log(`  ${paso.etiqueta}: ${rowCount}`);
    }
    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }

  const cuentas = await borrarCuentasDeAuth(objetivo.usuarioIds);
  if (cuentas > 0) console.log(`  cuentas de Supabase Auth: ${cuentas}`);

  console.log('\nLimpieza lista.');
}

// `--ejecutar` lo pone el script de npm. Sin ese flag el módulo solo
// exporta (así la ruta de API puede importarlo sin dispararlo al cargar).
if (process.argv.includes('--ejecutar')) {
  if (!process.argv.includes('--confirmar')) {
    console.error(
      'Esto borra datos. Revisá contra qué base apunta DATABASE_URL y volvé a correrlo con --confirmar.',
    );
    process.exit(1);
  }
  limpiarDemo()
    .then(() => obtenerPool().end())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
