/**
 * El límite de frecuencia deja de vivir en memoria del proceso.
 *
 * `src/lib/limiteFrecuencia.ts` contaba los intentos en un `Map`, y el
 * propio archivo avisaba que eso sólo alcanza con un proceso. **Ya corre
 * en más de uno**: Vercel levanta funciones serverless en paralelo, cada
 * una con su `Map` vacío. El límite de 5 registros cada 15 minutos era
 * en realidad 5 × la cantidad de instancias vivas, que es justo lo que
 * D-51 pide evitar —crear cuentas y organizaciones descartables en
 * serie—.
 *
 * Una tabla y no Redis: ya hay Postgres, y esto no justifica sumar un
 * servicio con su propia disponibilidad, su propia clave y su propia
 * factura.
 *
 * **Por qué una función y no tres consultas.** Limpiar, insertar y
 * contar desde la aplicación son tres viajes, y entre el insert y el
 * count otra instancia puede insertar lo suyo: dos pedidos simultáneos
 * se cuentan cada uno sin ver al otro y los dos pasan. El
 * `pg_advisory_xact_lock` serializa por clave —no por tabla—, así que
 * dos claves distintas no se estorban, y como la función se invoca con
 * un solo `SELECT`, el lock se toma y se suelta dentro de esa misma
 * transacción implícita.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE intento_limitado (
      clave text NOT NULL,
      momento timestamptz NOT NULL
    );
  `);

  // Las dos columnas juntas: cada llamada borra y cuenta filtrando por
  // clave y rango de momento, nunca por una sola de las dos.
  pgm.sql(`
    CREATE INDEX intento_limitado_clave_momento ON intento_limitado (clave, momento);
  `);

  pgm.sql(`
    CREATE FUNCTION registrar_intento_limitado(
      p_clave text,
      p_ventana_ms bigint,
      p_ahora timestamptz
    ) RETURNS integer
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      v_intentos integer;
    BEGIN
      -- Serializa por clave: dos pedidos de la misma cuenta se cuentan
      -- uno después del otro; dos cuentas distintas no se esperan.
      PERFORM pg_advisory_xact_lock(hashtext(p_clave));

      -- Fuera de la ventana. El \`<=\` replica el \`> desde\` que usaba la
      -- versión en memoria: un intento justo en el borde ya no cuenta.
      DELETE FROM intento_limitado
       WHERE clave = p_clave
         AND momento <= p_ahora - (p_ventana_ms * interval '1 millisecond');

      -- El intento se anota aunque termine rechazado: si no, reintentar
      -- rápido reiniciaría la ventana y el límite no frenaría nada.
      INSERT INTO intento_limitado (clave, momento) VALUES (p_clave, p_ahora);

      SELECT count(*) INTO v_intentos FROM intento_limitado WHERE clave = p_clave;
      RETURN v_intentos;
    END;
    $fn$;
  `);

  // Cada llamada limpia **su** clave, nunca las demás: una clave que no
  // se vuelve a consultar dejaría sus filas para siempre. La ventana más
  // larga que usa el producto es de 15 minutos, así que un día de
  // margen sobra y evita depender de que el barrido corra puntual.
  //
  // Dentro del `IF EXISTS` porque `pg_cron` no existe en el Postgres
  // local ni en CI. No necesita Vault ni `net.http_post`: es SQL que
  // corre dentro de la misma base.
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
          'limpiar-intentos-limitados',
          '7 5 * * *',
          $job$ DELETE FROM intento_limitado WHERE momento <= now() - interval '1 day' $job$
        );
      END IF;
    END
    $$;
  `);
};

/**
 * Vuelve atrás del todo. La aplicación cae sola al conteo en memoria
 * cuando la función no existe, así que desarmar esto degrada el límite
 * a por-instancia, no lo apaga.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('limpiar-intentos-limitados');
      END IF;
    END
    $$;
  `);
  pgm.sql(`DROP FUNCTION IF EXISTS registrar_intento_limitado(text, bigint, timestamptz);`);
  pgm.sql(`DROP TABLE IF EXISTS intento_limitado;`);
};
