-- Diagnóstico del estado de un ambiente de INVICTA.
--
-- Pegalo entero en el SQL Editor de Supabase (producción o pruebas) y
-- ejecutalo. Devuelve **cuatro filas, siempre**: eso es a propósito.
-- Las consultas sueltas que devuelven cero filas son ambiguas — cero es
-- la respuesta correcta para una y la equivocada para otra— y después
-- hay que acordarse de cuál se corrió.
--
-- Qué tiene que decir cada fila en un ambiente desplegado y sano:
--
--   permisos de anon/authenticated → OK — cero permisos (cerrado)
--   secreto host_canonico          → OK — apunta a https://...
--   tareas programadas             → ... => lee host_canonico (OK)
--   migración de permisos          → OK — aplicada DD/MM HH:MM
--
-- Corre sin romper en un Postgres suelto, sin pg_cron ni Vault: ahí las
-- filas 2 y 3 lo dicen en vez de fallar.

do $$
declare valor text;
begin
  drop table if exists diagnostico;
  create temp table diagnostico (orden int, chequeo text, resultado text);

  -- 1. Permisos de los roles públicos sobre public.
  select case when count(*) = 0 then 'OK — cero permisos (cerrado)'
              else 'ABIERTO — ' || count(*) || ' permisos en ' ||
                   count(distinct table_name) || ' tablas' end
    into valor
    from information_schema.role_table_grants
   where grantee in ('anon','authenticated') and table_schema = 'public';
  insert into diagnostico values (1, 'permisos de anon/authenticated', valor);

  -- 2. El secreto del host.
  if to_regclass('vault.decrypted_secrets') is null then
    valor := 'sin Vault (no es un proyecto de Supabase)';
  else
    execute $q$ select 'OK — apunta a ' || decrypted_secret
                  from vault.decrypted_secrets where name = 'host_canonico'
                 order by created_at desc limit 1 $q$ into valor;
    valor := coalesce(valor, 'FALTA — las tareas no van a correr');
  end if;
  insert into diagnostico values (2, 'secreto host_canonico', valor);

  -- 3. Las tareas agendadas y a dónde apuntan.
  if to_regclass('cron.job') is null then
    valor := 'sin pg_cron (no es un proyecto de Supabase)';
  else
    -- Tres casos, no dos. "No menciona el dominio" no es lo mismo que
    -- "lee el Vault": `limpiar-intentos-limitados` es un DELETE local
    -- que no sale a la red, y la versión anterior de esto lo etiquetaba
    -- como OK por descarte. Habría dicho lo mismo de una tarea
    -- apuntando a otro host escrito a fuego.
    execute $q$ select string_agg(jobname || ' => ' ||
                  case
                    when command not ilike '%net.http_post%'
                      then 'no sale a la red (SQL local)'
                    when command ilike '%host_canonico%'
                      then 'lee host_canonico (OK)'
                    else 'HOST ESCRITO ADENTRO (falta desplegar)'
                  end, '  |  ' order by jobname)
                  from cron.job $q$ into valor;
    valor := coalesce(valor, 'ninguna agendada');
  end if;
  insert into diagnostico values (3, 'tareas programadas', valor);

  -- 4. ¿Ya se desplegó la migración que cierra los permisos?
  if to_regclass('public.pgmigrations') is null then
    valor := 'sin tabla de migraciones';
  else
    execute $q$ select 'OK — aplicada ' || to_char(max(run_on), 'DD/MM HH24:MI')
                  from pgmigrations where name like '%cerrar-permisos%' $q$ into valor;
    valor := coalesce(valor, 'TODAVIA NO — falta desplegar (paso A2)');
  end if;
  insert into diagnostico values (4, 'migración de permisos', valor);
end $$;

select chequeo, resultado from diagnostico order by orden;
