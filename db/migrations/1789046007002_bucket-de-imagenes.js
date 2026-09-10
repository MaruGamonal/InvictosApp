/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Foto de perfil y escudo de equipo (`actualizarMiPerfil`/`actualizarEquipo`)
 * ya aceptan `fotoUrl`/`escudoUrl` desde T18/T19, pero nunca hubo cómo
 * conseguir esa URL — nada subía un archivo, había que ya tener la imagen
 * alojada en otro lado. Reportado en vivo: "no veo la funcionalidad para
 * agregar foto de perfil". El bucket es público de lectura (las fotos se
 * ven en fichas públicas) pero la escritura queda solo para el rol de
 * servicio: las rutas de subida (`/api/mi-perfil/foto`,
 * `/api/equipos/escudo`) validan la sesión y el permiso reusando los
 * servicios existentes antes de escribir con el cliente admin, así que no
 * hacen falta políticas RLS de INSERT/UPDATE acá.
 *
 * El esquema `storage` es de Supabase y no existe en el Postgres local de
 * desarrollo/CI — igual que `pg_cron`/Vault en migraciones anteriores,
 * queda guardado con un chequeo de existencia.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
          'media',
          'media',
          true,
          5242880,
          ARRAY['image/jpeg', 'image/png', 'image/webp']
        )
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END
    $$;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        DELETE FROM storage.buckets WHERE id = 'media';
      END IF;
    END
    $$;
  `);
};
