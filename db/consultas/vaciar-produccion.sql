-- VACIAR LA BASE — deja el producto en cero para empezar a usarlo de verdad.
--
-- BORRA TODO Y NO SE PUEDE DESHACER. No es la limpieza de datos demo
-- (`demo:limpiar`), que sólo toca lo marcado como `[DEMO]`: esto se
-- lleva puesto todo, incluidas las cuentas de gente real y la tuya.
--
-- Qué NO toca, y por qué:
--   · `provincia` y `ciudad`  → catálogo, lo carga una migración. Si se
--     borraran, el selector de ciudad quedaría vacío y haría falta
--     volver a correr las migraciones.
--   · `pgmigrations`          → el registro de qué migraciones se
--     aplicaron. Vaciarlo haría que el próximo despliegue intente
--     aplicarlas todas de nuevo sobre un esquema que ya existe.
--   · el esquema `storage`    → el bucket `media` y su configuración.
--     Los ARCHIVOS se borran aparte, desde el panel (ver el final).
--
-- Se corre desde el SQL Editor de Supabase, que no necesita la
-- contraseña de la base. **Un bloque por vez**: el editor muestra sólo
-- el resultado de la última consulta.


-- ───────────────────────────────────────────────────────────────────
-- BLOQUE 1 — Qué hay ahora (sólo lee)
--
-- Miralo antes de borrar. Es la última foto de lo que había.
-- ───────────────────────────────────────────────────────────────────

select 'usuarios' as que, count(*) from usuario
union all select 'perfiles', count(*) from perfil_deportivo
union all select 'organizaciones', count(*) from organizacion
union all select 'torneos', count(*) from torneo
union all select 'equipos', count(*) from equipo
union all select 'partidos', count(*) from partido
union all select 'cuentas en Auth', count(*) from auth.users
union all select '— catálogo: provincias', count(*) from provincia
union all select '— catálogo: ciudades', count(*) from ciudad
order by que;


-- ───────────────────────────────────────────────────────────────────
-- BLOQUE 2 — ¿El script está al día? (sólo lee)
--
-- Si el proyecto sumó tablas después de que esto se escribió, acá
-- aparecen. Tiene que devolver CERO FILAS. Si devuelve alguna, hay que
-- agregarla al bloque 3 antes de seguir: si no, quedan datos viejos
-- colgando en una tabla que nadie miró.
-- ───────────────────────────────────────────────────────────────────

select table_name as tabla_no_contemplada
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name not in (
    'alineacion_partido', 'certamen', 'colaborador_torneo', 'disputa_resultado',
    'equipo', 'estadistica_jugador', 'evento_partido', 'fase', 'grupo',
    'inscripcion', 'integrante_equipo', 'integrante_habilitado', 'intento_limitado',
    'miembro_organizacion', 'notificacion', 'organizacion', 'partido',
    'perfil_deportivo', 'posicion', 'preferencia_notificacion', 'reglamento',
    'score_equipo', 'sede', 'seguimiento', 'torneo', 'usuario',
    -- las tres que se preservan a propósito
    'provincia', 'ciudad', 'pgmigrations'
  )
order by table_name;


-- ───────────────────────────────────────────────────────────────────
-- BLOQUE 3 — Vaciar las tablas del producto
--
-- ⚠️  ACÁ SE BORRA. Un solo `TRUNCATE` con las 26 tablas juntas: es
-- atómico —o se vacían todas o no se vacía ninguna— y no hay que
-- ordenarlas a mano por dependencias, que es de donde salen los
-- errores en este tipo de limpieza.
-- ───────────────────────────────────────────────────────────────────

truncate table
  alineacion_partido, certamen, colaborador_torneo, disputa_resultado,
  equipo, estadistica_jugador, evento_partido, fase, grupo,
  inscripcion, integrante_equipo, integrante_habilitado, intento_limitado,
  miembro_organizacion, notificacion, organizacion, partido,
  perfil_deportivo, posicion, preferencia_notificacion, reglamento,
  score_equipo, sede, seguimiento, torneo, usuario
restart identity cascade;


-- ───────────────────────────────────────────────────────────────────
-- BLOQUE 4 — Borrar las cuentas de Supabase Auth
--
-- ⚠️  ACÁ SE BORRA. Las cuentas no viven en las tablas del producto:
-- `usuario` es nuestro espejo, y el login lo guarda Supabase en
-- `auth.users`. Sin este paso quedarían cuentas que pueden iniciar
-- sesión y caer en una aplicación que no sabe quiénes son.
-- ───────────────────────────────────────────────────────────────────

delete from auth.users;


-- ───────────────────────────────────────────────────────────────────
-- BLOQUE 5 — Comprobar (sólo lee)
--
-- Las seis primeras filas en 0. Las dos del catálogo NO: si dieran 0,
-- se borró de más y hay que volver a correr las migraciones.
-- ───────────────────────────────────────────────────────────────────

select 'usuarios' as que, count(*) from usuario
union all select 'perfiles', count(*) from perfil_deportivo
union all select 'organizaciones', count(*) from organizacion
union all select 'torneos', count(*) from torneo
union all select 'equipos', count(*) from equipo
union all select 'partidos', count(*) from partido
union all select 'cuentas en Auth', count(*) from auth.users
union all select '— catálogo: provincias (NO debe dar 0)', count(*) from provincia
union all select '— catálogo: ciudades (NO debe dar 0)', count(*) from ciudad
order by que;


-- ───────────────────────────────────────────────────────────────────
-- BLOQUE 6 — Los archivos, desde el panel
--
-- Esto no se hace con SQL. Los escudos, logos, imágenes de torneo y
-- reglamentos subidos viven en el bucket `media` de Supabase Storage,
-- no en la base. Borrar `storage.objects` a mano dejaría los archivos
-- reales ocupando lugar igual.
--
--   Storage → media → seleccionar todo → Delete
--
-- El bucket se queda; lo que se vacía es su contenido. Si se borrara el
-- bucket entero, habría que volver a crearlo con la misma
-- configuración (público, 5 MB, jpeg/png/webp) que fija la migración
-- `bucket-de-imagenes`.
