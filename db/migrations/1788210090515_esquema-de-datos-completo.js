/**
 * Esquema completo del MVP (Ticket 2, `11`).
 *
 * Traduce el modelo conceptual de `03-diagrama-entidad-relacion.md` a tablas,
 * con las seis claves determinísticas, las restricciones de `10`, 3.2 y los
 * índices de `10`, 3.3. No carga datos: la carga del catálogo nacional de
 * provincias/ciudades y de los catálogos de motivos es tarea aparte (`04`,
 * sección 8) y no bloquea este ticket.
 *
 * Notas sobre columnas que el ER describe en prosa pero no tabula como
 * enumeración (y por lo tanto no llevan CHECK acá, para no inventar valores
 * que la documentación no fijó):
 *   - `partido.motivo_no_disputado`: texto libre.
 *   - Los pares "motivo cerrado + texto libre" (`inscripcion.motivo_estado`,
 *     `torneo.motivo_cancelacion`) suman una columna `_detalle` para el
 *     texto libre que el catálogo (`04`, 4.15-4.16) dice que `other` habilita.
 *   - `ciudad.estado` y `fase.estado` usan la forma activo/inactivo o
 *     pendiente/en curso/cerrada que el propio ER describe en prosa, a falta
 *     de una tabla de enumeración dedicada en `04`.
 *   - `seguimiento.origen` usa el valor literal `automatico` que `10`, 4.9
 *     usa explícitamente, con `manual` como su contraparte.
 */

export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    -- =========================================================
    -- 3.22 — Provincia y Ciudad (catálogo, de solo lectura para
    -- el producto — D-88). Dos niveles y solo dos.
    -- =========================================================
    CREATE TABLE provincia (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL UNIQUE
    );

    CREATE TABLE ciudad (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provincia_id uuid NOT NULL REFERENCES provincia(id),
      nombre text NOT NULL,
      estado text NOT NULL DEFAULT 'active' CHECK (estado IN ('active', 'inactive'))
    );

    -- =========================================================
    -- 3.1 — Usuario (raíz del modelo). La FK hacia perfil_deportivo
    -- se agrega después de crear esa tabla (dependencia mutua 1 a 1).
    -- =========================================================
    CREATE TABLE usuario (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      nombre_completo text NOT NULL,
      telefono text,
      estado text NOT NULL DEFAULT 'active' CHECK (estado IN ('invited', 'active', 'inactive')),
      perfil_deportivo_id uuid UNIQUE,
      preferencias_notificacion jsonb NOT NULL DEFAULT '{}'::jsonb,
      fecha_alta timestamptz NOT NULL DEFAULT now()
    );

    -- =========================================================
    -- 3.2 — Perfil deportivo. Puede existir sin cuenta (D-12).
    -- =========================================================
    CREATE TABLE perfil_deportivo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid UNIQUE REFERENCES usuario(id),
      nombre_visible text NOT NULL,
      foto_url text,
      posicion text CHECK (
        posicion IN ('goalkeeper', 'defender', 'midfielder', 'forward', 'unspecified')
      ),
      ciudad_id uuid REFERENCES ciudad(id),
      visibilidad text NOT NULL DEFAULT 'public' CHECK (visibilidad IN ('public', 'restricted')),
      estado_reclamo text NOT NULL CHECK (estado_reclamo IN ('unclaimed', 'pending', 'claimed')),
      creado_por_usuario_id uuid NOT NULL REFERENCES usuario(id)
    );

    ALTER TABLE usuario
      ADD CONSTRAINT fk_usuario_perfil_deportivo
      FOREIGN KEY (perfil_deportivo_id) REFERENCES perfil_deportivo(id);

    -- =========================================================
    -- 3.3 — Organización (quien organiza torneos).
    -- =========================================================
    CREATE TABLE organizacion (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL,
      descripcion text,
      logo_url text,
      ciudad_id uuid REFERENCES ciudad(id),
      estado text NOT NULL DEFAULT 'active' CHECK (estado IN ('active', 'inactive')),
      nivel_verificacion text NOT NULL DEFAULT 'unverified'
        CHECK (nivel_verificacion IN ('unverified', 'basic', 'trusted')),
      fecha_verificacion timestamptz,
      usuario_titular_id uuid NOT NULL REFERENCES usuario(id),
      contacto_nombre text,
      contacto_telefono text,
      contacto_email text,
      fecha_alta timestamptz NOT NULL DEFAULT now()
    );

    -- =========================================================
    -- 3.4 — Miembro de Organización. Identidad determinística:
    -- un registro por combinación persona + organización + rol.
    -- =========================================================
    CREATE TABLE miembro_organizacion (
      usuario_id uuid NOT NULL REFERENCES usuario(id),
      organizacion_id uuid NOT NULL REFERENCES organizacion(id),
      rol text NOT NULL CHECK (rol IN ('owner', 'admin')),
      PRIMARY KEY (organizacion_id, usuario_id, rol)
    );

    -- =========================================================
    -- 3.5 — Equipo (entidad permanente y transversal a torneos).
    -- =========================================================
    CREATE TABLE equipo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL,
      escudo_url text,
      colores text,
      ciudad_id uuid REFERENCES ciudad(id),
      modalidad_habitual text CHECK (modalidad_habitual IN ('f5', 'f7', 'f8', 'f9', 'f11')),
      categoria_genero text NOT NULL CHECK (categoria_genero IN ('male', 'female', 'mixed')),
      estado text NOT NULL DEFAULT 'active' CHECK (estado IN ('active', 'archived')),
      -- perfil_capitan_id es NOT NULL (D-13): todo equipo tiene siempre un
      -- capitán. La FK hacia perfil_deportivo se agrega abajo porque
      -- integrante_equipo (que también referencia a equipo) va después.
      perfil_capitan_id uuid NOT NULL REFERENCES perfil_deportivo(id),
      creado_por_usuario_id uuid NOT NULL REFERENCES usuario(id),
      fecha_alta timestamptz NOT NULL DEFAULT now()
    );

    -- =========================================================
    -- 3.6 — Integrante de Equipo. Identidad determinística:
    -- un registro por combinación equipo + perfil + rol (D-23).
    -- =========================================================
    CREATE TABLE integrante_equipo (
      equipo_id uuid NOT NULL REFERENCES equipo(id),
      perfil_id uuid NOT NULL REFERENCES perfil_deportivo(id),
      rol_equipo text NOT NULL CHECK (rol_equipo IN ('captain', 'delegate', 'player', 'coach')),
      estado_vinculo text NOT NULL CHECK (
        estado_vinculo IN ('invited', 'requested', 'active', 'left', 'declined', 'cancelled')
      ),
      fecha_incorporacion timestamptz,
      fecha_baja timestamptz,
      PRIMARY KEY (equipo_id, perfil_id, rol_equipo)
    );

    -- =========================================================
    -- 3.7 — Torneo. "jugador_unico_por_equipo" es el parámetro
    -- configurable de D-17b (ver el trigger al final del archivo).
    -- =========================================================
    CREATE TABLE torneo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organizacion_id uuid NOT NULL REFERENCES organizacion(id),
      nombre text NOT NULL,
      descripcion text,
      modalidad text NOT NULL CHECK (modalidad IN ('f5', 'f7', 'f8', 'f9', 'f11')),
      categoria_genero text NOT NULL CHECK (categoria_genero IN ('male', 'female', 'mixed')),
      categoria_edad text NOT NULL DEFAULT 'open' CHECK (
        categoria_edad IN ('open', 'u13', 'u15', 'u17', 'u20', 'veterans_35', 'veterans_45')
      ),
      ciudad_id uuid NOT NULL REFERENCES ciudad(id),
      direccion text,
      estado text NOT NULL DEFAULT 'draft' CHECK (
        estado IN (
          'draft', 'registration_open', 'registration_closed', 'in_progress',
          'finished', 'suspended', 'cancelled'
        )
      ),
      visibilidad text NOT NULL DEFAULT 'unlisted' CHECK (visibilidad IN ('public', 'unlisted')),
      formato text NOT NULL CHECK (formato IN ('league', 'knockout', 'groups_knockout')),
      cupo_equipos integer NOT NULL CHECK (cupo_equipos > 0),
      min_jugadores_lista integer,
      max_jugadores_lista integer,
      puntos_victoria integer NOT NULL DEFAULT 3,
      puntos_empate integer NOT NULL DEFAULT 1,
      puntos_derrota integer NOT NULL DEFAULT 0,
      criterios_desempate jsonb NOT NULL DEFAULT
        '["goal_difference", "goals_for", "head_to_head"]'::jsonb,
      fecha_inicio_estimada timestamptz,
      fecha_fin_estimada timestamptz,
      motivo_cancelacion text CHECK (
        motivo_cancelacion IN (
          'insufficient_teams', 'venue_unavailable', 'weather', 'organizer_decision', 'other'
        )
      ),
      motivo_cancelacion_detalle text,
      fecha_publicacion timestamptz,
      -- Parámetro de D-17b: si está prohibido (default) que un mismo
      -- jugador quede habilitado por dos equipos de este torneo.
      jugador_unico_por_equipo boolean NOT NULL DEFAULT true,
      -- Control optimista ("10", 2.5 / T-03). No es un atributo de negocio
      -- del ER: lo exige la especificación técnica.
      version integer NOT NULL DEFAULT 1
    );

    -- =========================================================
    -- 3.8 — Fase y Grupo.
    -- =========================================================
    CREATE TABLE fase (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      torneo_id uuid NOT NULL REFERENCES torneo(id),
      nombre text NOT NULL,
      tipo_fase text NOT NULL CHECK (tipo_fase IN ('league', 'knockout')),
      orden integer NOT NULL,
      ida_y_vuelta boolean NOT NULL DEFAULT false,
      clasifican_por_grupo integer,
      estado text NOT NULL DEFAULT 'pending'
        CHECK (estado IN ('pending', 'in_progress', 'closed'))
    );

    CREATE TABLE grupo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      fase_id uuid NOT NULL REFERENCES fase(id),
      nombre text NOT NULL
    );

    -- =========================================================
    -- 3.20 — Reglamento (versionado). Va antes de Inscripción
    -- porque ésta lo referencia (versión aceptada).
    -- =========================================================
    CREATE TABLE reglamento (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      torneo_id uuid NOT NULL REFERENCES torneo(id),
      numero_version integer NOT NULL,
      texto text,
      archivo_url text,
      estado text NOT NULL DEFAULT 'current' CHECK (estado IN ('current', 'superseded')),
      fecha_publicacion timestamptz NOT NULL DEFAULT now(),
      publicado_por_usuario_id uuid NOT NULL REFERENCES usuario(id),
      UNIQUE (torneo_id, numero_version)
    );

    -- =========================================================
    -- 3.16 — Sede.
    -- =========================================================
    CREATE TABLE sede (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nombre text NOT NULL,
      direccion text NOT NULL,
      ciudad_id uuid NOT NULL REFERENCES ciudad(id),
      organizacion_id uuid NOT NULL REFERENCES organizacion(id)
    );

    -- =========================================================
    -- 3.9 — Inscripción. No tiene id propio: (torneo_id, equipo_id)
    -- es su identidad (relación 1 a 1 equipo-torneo).
    -- =========================================================
    CREATE TABLE inscripcion (
      torneo_id uuid NOT NULL REFERENCES torneo(id),
      equipo_id uuid NOT NULL REFERENCES equipo(id),
      grupo_id uuid REFERENCES grupo(id),
      estado text NOT NULL DEFAULT 'pending' CHECK (
        estado IN ('pending', 'approved', 'rejected', 'withdrawn', 'excluded', 'waitlisted')
      ),
      motivo_estado text CHECK (
        motivo_estado IN ('withdrew', 'no_show', 'roster_incomplete', 'disciplinary', 'other')
      ),
      motivo_estado_detalle text,
      costo numeric(12, 2) NOT NULL DEFAULT 0,
      solicitada_por_usuario_id uuid REFERENCES usuario(id),
      resuelta_por_usuario_id uuid REFERENCES usuario(id),
      fecha_solicitud timestamptz NOT NULL DEFAULT now(),
      fecha_resolucion timestamptz,
      plantel_confirmado boolean NOT NULL DEFAULT false,
      advertencia_categoria boolean NOT NULL DEFAULT false,
      reglamento_version_aceptada integer,
      fecha_aceptacion_reglamento timestamptz,
      PRIMARY KEY (torneo_id, equipo_id),
      FOREIGN KEY (torneo_id, reglamento_version_aceptada) REFERENCES reglamento(torneo_id, numero_version)
    );

    -- =========================================================
    -- 3.10 — Integrante Habilitado ("lista de buena fe"). La FK
    -- compuesta hacia Inscripción (no hacia Equipo) es lo que hace
    -- estructuralmente imposible habilitar a alguien por un equipo
    -- que no está inscripto en ese torneo.
    -- =========================================================
    CREATE TABLE integrante_habilitado (
      torneo_id uuid NOT NULL,
      equipo_id uuid NOT NULL,
      perfil_id uuid NOT NULL REFERENCES perfil_deportivo(id),
      rol_en_torneo text NOT NULL CHECK (rol_en_torneo IN ('player', 'coach', 'delegate')),
      numero_camiseta integer,
      estado text NOT NULL DEFAULT 'eligible'
        CHECK (estado IN ('eligible', 'unavailable', 'suspended')),
      fecha_habilitacion timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (torneo_id, equipo_id, perfil_id, rol_en_torneo),
      FOREIGN KEY (torneo_id, equipo_id) REFERENCES inscripcion(torneo_id, equipo_id)
    );

    -- La restricción de D-17b (un perfil no puede figurar como jugador
    -- habilitado por dos equipos del mismo torneo) es *configurable por
    -- torneo* (torneo.jugador_unico_por_equipo), así que no puede
    -- expresarse como un índice único parcial de esta tabla: el
    -- predicado de un índice no puede consultar otra tabla, y un índice
    -- siempre activo bloquearía también a los torneos que la desactivan.
    -- Se aplica con un trigger — ver el final del archivo.

    -- =========================================================
    -- 3.21 — Colaborador de Torneo. No tiene id propio: (torneo_id,
    -- usuario_id) es su identidad (relación 1 a 1 torneo-persona).
    -- =========================================================
    CREATE TABLE colaborador_torneo (
      torneo_id uuid NOT NULL REFERENCES torneo(id),
      usuario_id uuid NOT NULL REFERENCES usuario(id),
      estado text NOT NULL DEFAULT 'invited' CHECK (estado IN ('invited', 'active', 'removed')),
      asignado_por_usuario_id uuid NOT NULL REFERENCES usuario(id),
      fecha_asignacion timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (torneo_id, usuario_id)
    );

    -- =========================================================
    -- 3.11 — Partido. La entidad central del producto. Las FK
    -- compuestas hacia Inscripción (no hacia Equipo) hacen imposible
    -- que un partido involucre un equipo no inscripto en ese torneo.
    -- =========================================================
    CREATE TABLE partido (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      torneo_id uuid NOT NULL REFERENCES torneo(id),
      fase_id uuid NOT NULL REFERENCES fase(id),
      grupo_id uuid REFERENCES grupo(id),
      numero_fecha integer NOT NULL,
      equipo_local_id uuid NOT NULL,
      equipo_visitante_id uuid NOT NULL,
      sede_id uuid REFERENCES sede(id),
      fecha_hora_programada timestamptz,
      fecha_hora_original timestamptz,
      reprogramado_por_usuario_id uuid REFERENCES usuario(id),
      estado text NOT NULL DEFAULT 'unscheduled' CHECK (
        estado IN ('unscheduled', 'scheduled', 'played', 'walkover', 'postponed', 'cancelled')
      ),
      goles_local integer CHECK (goles_local >= 0),
      goles_visitante integer CHECK (goles_visitante >= 0),
      estado_resultado text NOT NULL DEFAULT 'pending'
        CHECK (estado_resultado IN ('pending', 'loaded', 'confirmed', 'disputed')),
      motivo_no_disputado text,
      cargado_por_usuario_id uuid REFERENCES usuario(id),
      fecha_carga_resultado timestamptz,
      fecha_confirmacion_resultado timestamptz,
      -- Control optimista ("10", 2.5 / T-03), igual que en Torneo.
      version integer NOT NULL DEFAULT 1,
      FOREIGN KEY (torneo_id, equipo_local_id) REFERENCES inscripcion(torneo_id, equipo_id),
      FOREIGN KEY (torneo_id, equipo_visitante_id) REFERENCES inscripcion(torneo_id, equipo_id)
    );

    -- =========================================================
    -- 3.12 — Evento de Partido.
    -- =========================================================
    CREATE TABLE evento_partido (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      partido_id uuid NOT NULL REFERENCES partido(id),
      perfil_id uuid NOT NULL REFERENCES perfil_deportivo(id),
      equipo_id uuid NOT NULL REFERENCES equipo(id),
      tipo_evento text NOT NULL CHECK (
        tipo_evento IN ('goal', 'own_goal', 'yellow_card', 'red_card')
      ),
      minuto integer,
      registrado_por_usuario_id uuid REFERENCES usuario(id)
    );

    -- =========================================================
    -- 3.13 — Disputa de Resultado.
    -- =========================================================
    CREATE TABLE disputa_resultado (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      partido_id uuid NOT NULL REFERENCES partido(id),
      presentada_por_usuario_id uuid NOT NULL REFERENCES usuario(id),
      equipo_id uuid NOT NULL REFERENCES equipo(id),
      motivo text NOT NULL,
      estado text NOT NULL DEFAULT 'open'
        CHECK (estado IN ('open', 'upheld', 'rejected', 'withdrawn')),
      resolucion text,
      resuelta_por_usuario_id uuid REFERENCES usuario(id),
      fecha_presentacion timestamptz NOT NULL DEFAULT now()
    );

    -- =========================================================
    -- 3.14 — Posición. No tiene id propio: (grupo_id, equipo_id)
    -- es su identidad (un equipo no puede tener dos filas).
    -- =========================================================
    CREATE TABLE posicion (
      grupo_id uuid NOT NULL REFERENCES grupo(id),
      equipo_id uuid NOT NULL REFERENCES equipo(id),
      puntos integer NOT NULL DEFAULT 0,
      partidos_jugados integer NOT NULL DEFAULT 0,
      ganados integer NOT NULL DEFAULT 0,
      empatados integer NOT NULL DEFAULT 0,
      perdidos integer NOT NULL DEFAULT 0,
      goles_favor integer NOT NULL DEFAULT 0,
      goles_contra integer NOT NULL DEFAULT 0,
      diferencia_gol integer NOT NULL DEFAULT 0,
      ajuste_puntos integer NOT NULL DEFAULT 0,
      posicion_actual integer,
      ultima_actualizacion timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (grupo_id, equipo_id)
    );

    -- =========================================================
    -- 3.15 — Estadística de Jugador. Se acumula por torneo, no
    -- globalmente.
    -- =========================================================
    CREATE TABLE estadistica_jugador (
      torneo_id uuid NOT NULL REFERENCES torneo(id),
      perfil_id uuid NOT NULL REFERENCES perfil_deportivo(id),
      equipo_id uuid NOT NULL REFERENCES equipo(id),
      partidos_jugados integer NOT NULL DEFAULT 0,
      goles integer NOT NULL DEFAULT 0,
      tarjetas_amarillas integer NOT NULL DEFAULT 0,
      tarjetas_rojas integer NOT NULL DEFAULT 0,
      ultima_actualizacion timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (torneo_id, perfil_id, equipo_id)
    );

    -- =========================================================
    -- 3.17 — Score de Equipo. Los insumos se registran desde el
    -- MVP; el cálculo es de etapa futura ("06", 5.4). Un equipo
    -- tiene un único score vigente: la identidad es equipo_id.
    -- =========================================================
    CREATE TABLE score_equipo (
      equipo_id uuid PRIMARY KEY REFERENCES equipo(id),
      valor numeric,
      desglose_componentes jsonb,
      version_formula text,
      partidos_computados integer NOT NULL DEFAULT 0,
      estado text NOT NULL DEFAULT 'insufficient_activity'
        CHECK (estado IN ('insufficient_activity', 'active', 'stale')),
      ultima_actualizacion timestamptz
    );

    -- =========================================================
    -- 3.18 — Seguimiento. Una entidad única para los tres tipos.
    -- =========================================================
    CREATE TABLE seguimiento (
      usuario_id uuid NOT NULL REFERENCES usuario(id),
      tipo_seguido text NOT NULL CHECK (tipo_seguido IN ('tournament', 'team', 'player')),
      entidad_seguida_id uuid NOT NULL,
      origen text NOT NULL CHECK (origen IN ('manual', 'automatico')),
      fecha_alta timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (usuario_id, tipo_seguido, entidad_seguida_id)
    );

    -- =========================================================
    -- 3.19 — Notificación. Un registro por canal ("10", T-08).
    -- =========================================================
    CREATE TABLE notificacion (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id uuid NOT NULL REFERENCES usuario(id),
      tipo text NOT NULL CHECK (
        tipo IN (
          'team_invitation', 'team_join_requested', 'team_join_resolved',
          'registration_received', 'registration_resolved', 'roster_required',
          'match_scheduled', 'match_rescheduled', 'result_pending_confirmation',
          'result_disputed', 'tournament_published', 'tournament_started',
          'tournament_finished', 'tournament_cancelled', 'tournament_rules_updated',
          'result_published'
        )
      ),
      entidad_origen_tipo text,
      entidad_origen_id uuid,
      canal text NOT NULL CHECK (canal IN ('in_app', 'email')),
      estado text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending', 'delivered', 'read')),
      fecha_generacion timestamptz NOT NULL DEFAULT now()
    );

    -- =========================================================
    -- Índices críticos ("10", 3.3).
    -- =========================================================
    CREATE INDEX torneo_descubrimiento_idx
      ON torneo (estado, ciudad_id, modalidad, categoria_edad, fecha_inicio_estimada);
    CREATE INDEX torneo_organizacion_estado_idx ON torneo (organizacion_id, estado);
    CREATE INDEX ciudad_provincia_nombre_idx ON ciudad (provincia_id, nombre);
    CREATE INDEX partido_torneo_fecha_idx ON partido (torneo_id, numero_fecha);
    CREATE INDEX partido_resultado_pendiente_idx ON partido (estado_resultado, fecha_carga_resultado);
    CREATE INDEX posicion_orden_idx ON posicion (grupo_id, puntos DESC, diferencia_gol DESC, goles_favor DESC);
    CREATE INDEX inscripcion_torneo_estado_idx ON inscripcion (torneo_id, estado);
    CREATE INDEX integrante_equipo_perfil_idx ON integrante_equipo (perfil_id);

    -- =========================================================
    -- Trigger de D-17b: un perfil no puede quedar habilitado como
    -- jugador por dos equipos del mismo torneo, salvo que el torneo
    -- lo permita explícitamente (torneo.jugador_unico_por_equipo).
    -- Es un trigger y no un índice único porque la regla es
    -- condicional por torneo, y el predicado de un índice no puede
    -- consultar otra tabla.
    -- =========================================================
    CREATE OR REPLACE FUNCTION validar_jugador_habilitado_unico()
    RETURNS trigger AS $$
    DECLARE
      permite_multiples boolean;
      ya_habilitado boolean;
    BEGIN
      IF NEW.rol_en_torneo <> 'player' THEN
        RETURN NEW;
      END IF;

      SELECT NOT jugador_unico_por_equipo INTO permite_multiples
      FROM torneo WHERE id = NEW.torneo_id;

      IF permite_multiples THEN
        RETURN NEW;
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM integrante_habilitado
        WHERE torneo_id = NEW.torneo_id
          AND perfil_id = NEW.perfil_id
          AND rol_en_torneo = 'player'
          AND equipo_id <> NEW.equipo_id
      ) INTO ya_habilitado;

      IF ya_habilitado THEN
        RAISE EXCEPTION 'JUGADOR_YA_HABILITADO_EN_EL_TORNEO'
          USING DETAIL = format('perfil %s ya habilitado como jugador en el torneo %s por otro equipo', NEW.perfil_id, NEW.torneo_id);
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_validar_jugador_habilitado_unico
      BEFORE INSERT OR UPDATE ON integrante_habilitado
      FOR EACH ROW EXECUTE FUNCTION validar_jugador_habilitado_unico();
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_validar_jugador_habilitado_unico ON integrante_habilitado;
    DROP FUNCTION IF EXISTS validar_jugador_habilitado_unico();
    DROP TABLE IF EXISTS notificacion;
    DROP TABLE IF EXISTS seguimiento;
    DROP TABLE IF EXISTS score_equipo;
    DROP TABLE IF EXISTS estadistica_jugador;
    DROP TABLE IF EXISTS posicion;
    DROP TABLE IF EXISTS disputa_resultado;
    DROP TABLE IF EXISTS evento_partido;
    DROP TABLE IF EXISTS partido;
    DROP TABLE IF EXISTS colaborador_torneo;
    DROP TABLE IF EXISTS integrante_habilitado;
    DROP TABLE IF EXISTS inscripcion;
    DROP TABLE IF EXISTS sede;
    DROP TABLE IF EXISTS reglamento;
    DROP TABLE IF EXISTS grupo;
    DROP TABLE IF EXISTS fase;
    DROP TABLE IF EXISTS torneo;
    DROP TABLE IF EXISTS integrante_equipo;
    DROP TABLE IF EXISTS equipo;
    DROP TABLE IF EXISTS miembro_organizacion;
    DROP TABLE IF EXISTS organizacion;
    ALTER TABLE usuario DROP CONSTRAINT IF EXISTS fk_usuario_perfil_deportivo;
    DROP TABLE IF EXISTS perfil_deportivo;
    DROP TABLE IF EXISTS usuario;
    DROP TABLE IF EXISTS ciudad;
    DROP TABLE IF EXISTS provincia;
  `);
};
