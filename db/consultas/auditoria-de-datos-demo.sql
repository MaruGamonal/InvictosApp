-- ¿Hay datos demo en esta base?
--
-- Es el equivalente en SQL de `npm run demo:auditar`, para correrlo sin
-- tener el proyecto instalado: pegalo entero en el SQL Editor de
-- Supabase y ejecutalo.
--
-- Sólo lee. No modifica nada.
--
-- En producción, antes de abrir a usuarios reales, las seis primeras
-- filas tienen que decir 0.
--
-- La última fila es la que evita el autoengaño: dice cuántas filas **no**
-- demo hay, para que "todo en cero" no pueda confundirse con "la base
-- está vacía".

select 1 as orden, 'cuentas con dominio demo' as que,
       count(*) as cuantas
  from usuario
 where email ilike '%@demo.invicta.com.ar' or email ilike '%@demo.invicta.local'

union all
select 2, 'organizaciones [DEMO]', count(*) from organizacion where nombre ilike '%[DEMO]%'
union all
select 3, 'torneos [DEMO]', count(*) from torneo where nombre ilike '%[DEMO]%'
union all
select 4, 'equipos [DEMO]', count(*) from equipo where nombre ilike '%[DEMO]%'
union all
select 5, 'certámenes [DEMO]', count(*) from certamen where nombre ilike '%[DEMO]%'
union all
select 6, 'perfiles de cuentas demo', count(*)
  from perfil_deportivo p join usuario u on u.id = p.usuario_id
 where u.email ilike '%@demo.invicta.com.ar' or u.email ilike '%@demo.invicta.local'

union all
select 7, '— y para comparar: cuentas NO demo', count(*)
  from usuario
 where email not ilike '%@demo.invicta.com.ar' and email not ilike '%@demo.invicta.local'
union all
select 8, '— y torneos NO demo', count(*) from torneo where nombre not ilike '%[DEMO]%'

order by orden;
