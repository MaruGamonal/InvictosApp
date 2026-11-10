/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Le quita a `anon` y `authenticated` todo permiso sobre el esquema
 * `public`.
 *
 * **Qué estaba pasando.** Un proyecto de Supabase nace con la Data API
 * (PostgREST) prendida y con *default privileges* que le conceden a esos
 * dos roles `ALL` sobre cada tabla nueva del esquema `public`. En un
 * proyecto que usa Supabase para todo, eso se compensa con RLS. Acá no:
 * esta aplicación habla con Postgres **directo** por `DATABASE_URL` y
 * usa Supabase sólo para Auth y Storage, así que nunca hubo una sola
 * política de RLS — no hacía falta ninguna.
 *
 * El resultado: `SELECT, INSERT, UPDATE, DELETE, TRUNCATE` sobre todas
 * las tablas, para un rol al que se llega con la anon key — que **no es
 * secreta**: es `NEXT_PUBLIC_` y viaja en el bundle del navegador.
 *
 * **No hubo exposición**, porque la Data API estaba apagada y sin
 * PostgREST no hay camino HTTP hasta esos permisos. Lo que había era
 * toda la protección colgando de un toggle del panel: alcanzaba con que
 * alguien lo prendiera una vez, para probar algo, y el agujero se abría
 * solo. Esto lo cierra por abajo, donde no depende de una pantalla de
 * configuración.
 *
 * **Por qué una migración y no un SQL a mano.** Por tres razones:
 *
 * 1. Apagar la Data API cierra el camino HTTP, pero deja la seguridad
 *    colgando de un toggle del panel. Esto saca el permiso de abajo.
 * 2. Cada ambiente nuevo nace con el agujero. Una migración lo cierra
 *    sola; un SQL a mano hay que acordarse en cada proyecto.
 * 3. Sobre todo: **las tablas nuevas vuelven a nacer concedidas**. Los
 *    default privileges siguen ahí, así que revocar lo de hoy sin
 *    tocarlos significa que la próxima migración que cree una tabla
 *    reabre el agujero para esa tabla, en silencio.
 *
 * No se toca `service_role`: esa clave sí es secreta, nunca sale del
 * servidor, y es la que usan la subida de imágenes y el alta de cuentas.
 * Tampoco se tocan los esquemas `auth` ni `storage`, que son de Supabase
 * y tienen sus propios roles.
 *
 * Todo va dentro de un chequeo de existencia de los roles porque
 * `anon` y `authenticated` no existen en el Postgres local ni en el de
 * CI — mismo criterio que las migraciones de `pg_cron`.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
      rol text;
      creador text;
    BEGIN
      FOREACH rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol);

        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', rol);
        EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', rol);
        EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', rol);
        EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', rol);

        -- Lo que de verdad cierra el agujero a futuro: que las tablas
        -- que cree la próxima migración no nazcan concedidas. Se
        -- recorre quién tiene default privileges puestos sobre
        -- "public" en vez de adivinar el nombre del rol creador, que
        -- cambia entre proyectos de Supabase.
        FOR creador IN
          SELECT DISTINCT pg_get_userbyid(d.defaclrole)
          FROM pg_default_acl d
          JOIN pg_namespace n ON n.oid = d.defaclnamespace
          WHERE n.nspname = 'public'
          UNION
          SELECT current_user
        LOOP
          BEGIN
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
              creador, rol);
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
              creador, rol);
            EXECUTE format(
              'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I',
              creador, rol);
          EXCEPTION WHEN insufficient_privilege THEN
            -- No somos miembros de ese rol. Se avisa y se sigue: cortar
            -- acá dejaría sin aplicar lo de los roles que sí podemos.
            RAISE NOTICE 'Sin permiso para tocar los default privileges de %; revisalo a mano', creador;
          END;
        END LOOP;
      END LOOP;
    END
    $$;
  `);
};

/**
 * Devuelve los permisos que Supabase pone por defecto.
 *
 * Existe para que la migración sea reversible, no porque convenga
 * correrlo: deja la base como estaba, o sea con todas las tablas al
 * alcance de la anon key si la Data API llegara a estar prendida.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
      rol text;
    BEGIN
      FOREACH rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol);
        EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', rol);
        EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA public TO %I', rol);
        EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO %I', rol);
        EXECUTE format('GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO %I', rol);
        BEGIN
          EXECUTE format(
            'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO %I', rol);
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'Sin permiso para restaurar los default privileges de %', rol;
        END;
      END LOOP;
    END
    $$;
  `);
};
