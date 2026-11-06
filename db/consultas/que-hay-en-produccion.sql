-- Qué hay en esta base que NO está marcado como demo.
--
-- La auditoría de datos demo dice cuánto hay para borrar. Esto dice
-- qué queda: lo que `demo:limpiar` **no** toca y que, si es de pruebas
-- hechas a mano, va a quedar a la vista cuando abras el sitio.
--
-- Sólo lee. No modifica nada.
--
-- La columna `se_ve_en_el_buscador` es la que importa: un torneo sólo
-- aparece en el descubrimiento si es `public` **y** su organización
-- está verificada (`06`, D-51). Los `unlisted` y los borradores
-- existen pero no los encuentra nadie que no tenga el enlace.

select
  t.nombre,
  t.estado,
  t.visibilidad,
  o.nombre as organizacion,
  o.nivel_verificacion as verificacion_org,
  case
    when t.visibilidad = 'public' and o.nivel_verificacion <> 'unverified'
      then 'SÍ — lo encuentra cualquiera'
    when t.visibilidad = 'public'
      then 'no (organización sin verificar)'
    else 'no (' || t.visibilidad || ')'
  end as se_ve_en_el_buscador,
  t.fecha_publicacion::date as publicado
from torneo t
join organizacion o on o.id = t.organizacion_id
where t.nombre not ilike '%[DEMO]%'
order by se_ve_en_el_buscador desc, t.nombre;

-- Y las cuentas que no son demo, para reconocerlas.
select
  u.email,
  u.nombre_completo,
  u.estado,
  u.email_confirmado,
  u.fecha_alta::date as creada
from usuario u
where u.email not ilike '%@demo.invicta.com.ar'
  and u.email not ilike '%@demo.invicta.local'
order by u.fecha_alta;
