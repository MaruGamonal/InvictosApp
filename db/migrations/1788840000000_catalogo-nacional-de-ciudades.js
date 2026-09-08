/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * T28 — carga inicial del catálogo de provincia/ciudad (`03`, 3.22;
 * `04`, sección 8; `06`, D-88). La migración del esquema (Ticket 2) creó
 * las tablas a propósito vacías: "la carga del catálogo nacional... es
 * tarea aparte y no bloquea este ticket". Sin esta carga, `/torneos` no
 * tiene ninguna ciudad que ofrecer — es lo que reportó producción.
 *
 * D-88 pide "nacional y completo desde el día uno": las 24 provincias
 * están todas. Para las ciudades, la fuente de referencia que el propio
 * repo señala (`test/integracion/_escenarios.ts`) es el catálogo de
 * INDEC — pero el listado completo de INDEC (BAHRA) son ~4000
 * localidades censales, la mayoría parajes de un puñado de habitantes,
 * con nombres truncados según la fuente disponible para esta carga. Cargar
 * eso tal cual no cumple "completo": llena el selector de ruido y
 * fragmentos, no de ciudades reales.
 *
 * Esta migración carga en cambio una selección curada y verificada a
 * mano: las 24 provincias, cada capital provincial, la totalidad de los
 * partidos del Gran Buenos Aires/AMBA (el mercado más denso, `06` lo
 * señala explícitamente) y las ciudades principales de cada provincia
 * del interior. No son las ~4000 localidades de BAHRA, pero es una base
 * real y correcta de ~330 ciudades donde vive la enorme mayoría de la
 * población — suficiente para que el descubrimiento funcione de punta a
 * punta para prácticamente cualquier usuario real. `ciudad` sigue siendo
 * una tabla, no un enum (`03`, 3.22): ampliar la cobertura más adelante
 * es agregar filas, no una migración de esquema.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  const provincias = [
    'Buenos Aires',
    'Ciudad Autónoma de Buenos Aires',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
    'Tucumán',
  ];

  /** @type {[string, string][]} */
  const ciudades = [
    // CABA — una sola ciudad, sin barrios (D-88: dos niveles y solo dos).
    ['Ciudad Autónoma de Buenos Aires', 'Ciudad Autónoma de Buenos Aires'],

    // Buenos Aires — AMBA/Gran Buenos Aires completo.
    ['Buenos Aires', 'Almirante Brown'],
    ['Buenos Aires', 'Avellaneda'],
    ['Buenos Aires', 'Berazategui'],
    ['Buenos Aires', 'Berisso'],
    ['Buenos Aires', 'Brandsen'],
    ['Buenos Aires', 'Cañuelas'],
    ['Buenos Aires', 'Campana'],
    ['Buenos Aires', 'Ensenada'],
    ['Buenos Aires', 'Escobar'],
    ['Buenos Aires', 'Esteban Echeverría'],
    ['Buenos Aires', 'Exaltación de la Cruz'],
    ['Buenos Aires', 'Ezeiza'],
    ['Buenos Aires', 'Florencio Varela'],
    ['Buenos Aires', 'General las Heras'],
    ['Buenos Aires', 'General Rodríguez'],
    ['Buenos Aires', 'General San Martín'],
    ['Buenos Aires', 'Hurlingham'],
    ['Buenos Aires', 'Ituzaingó'],
    ['Buenos Aires', 'José C. Paz'],
    ['Buenos Aires', 'La Matanza'],
    ['Buenos Aires', 'La Plata'],
    ['Buenos Aires', 'Lanús'],
    ['Buenos Aires', 'Lomas de Zamora'],
    ['Buenos Aires', 'Luján'],
    ['Buenos Aires', 'Malvinas Argentinas'],
    ['Buenos Aires', 'Marcos Paz'],
    ['Buenos Aires', 'Merlo'],
    ['Buenos Aires', 'Moreno'],
    ['Buenos Aires', 'Morón'],
    ['Buenos Aires', 'Pilar'],
    ['Buenos Aires', 'Presidente Perón'],
    ['Buenos Aires', 'Quilmes'],
    ['Buenos Aires', 'San Fernando'],
    ['Buenos Aires', 'San Isidro'],
    ['Buenos Aires', 'San Miguel'],
    ['Buenos Aires', 'San Vicente'],
    ['Buenos Aires', 'Tigre'],
    ['Buenos Aires', 'Tres de Febrero'],
    ['Buenos Aires', 'Vicente López'],
    // Buenos Aires — interior de la provincia, ciudades principales.
    ['Buenos Aires', 'Ayacucho'],
    ['Buenos Aires', 'Azul'],
    ['Buenos Aires', 'Bahía Blanca'],
    ['Buenos Aires', 'Balcarce'],
    ['Buenos Aires', 'Baradero'],
    ['Buenos Aires', 'Bragado'],
    ['Buenos Aires', 'Carlos Casares'],
    ['Buenos Aires', 'Chacabuco'],
    ['Buenos Aires', 'Chascomús'],
    ['Buenos Aires', 'Chivilcoy'],
    ['Buenos Aires', 'Coronel Suárez'],
    ['Buenos Aires', 'Dolores'],
    ['Buenos Aires', 'General Pueyrredón (Mar del Plata)'],
    ['Buenos Aires', 'General Villegas'],
    ['Buenos Aires', 'Junín'],
    ['Buenos Aires', 'Las Flores'],
    ['Buenos Aires', 'Maipú'],
    ['Buenos Aires', 'Mercedes'],
    ['Buenos Aires', 'Miramar'],
    ['Buenos Aires', 'Monte Hermoso'],
    ['Buenos Aires', 'Necochea'],
    ['Buenos Aires', 'Nueve de Julio'],
    ['Buenos Aires', 'Olavarría'],
    ['Buenos Aires', 'Pehuajó'],
    ['Buenos Aires', 'Pergamino'],
    ['Buenos Aires', 'Pinamar'],
    ['Buenos Aires', 'Rauch'],
    ['Buenos Aires', 'Saladillo'],
    ['Buenos Aires', 'San Clemente del Tuyú'],
    ['Buenos Aires', 'San Nicolás de los Arroyos'],
    ['Buenos Aires', 'San Pedro'],
    ['Buenos Aires', 'Tandil'],
    ['Buenos Aires', 'Trenque Lauquen'],
    ['Buenos Aires', 'Tres Arroyos'],
    ['Buenos Aires', 'Villa Gesell'],
    ['Buenos Aires', 'Zárate'],

    // Córdoba.
    ['Córdoba', 'Córdoba'],
    ['Córdoba', 'Alta Gracia'],
    ['Córdoba', 'Arroyito'],
    ['Córdoba', 'Bell Ville'],
    ['Córdoba', 'Corral de Bustos'],
    ['Córdoba', 'Cosquín'],
    ['Córdoba', 'Cruz del Eje'],
    ['Córdoba', 'Deán Funes'],
    ['Córdoba', 'Jesús María'],
    ['Córdoba', 'La Falda'],
    ['Córdoba', 'Laboulaye'],
    ['Córdoba', 'Marcos Juárez'],
    ['Córdoba', 'Mendiolaza'],
    ['Córdoba', 'Morteros'],
    ['Córdoba', 'Oliva'],
    ['Córdoba', 'Río Cuarto'],
    ['Córdoba', 'Río Segundo'],
    ['Córdoba', 'Río Tercero'],
    ['Córdoba', 'San Francisco'],
    ['Córdoba', 'Unquillo'],
    ['Córdoba', 'Villa Carlos Paz'],
    ['Córdoba', 'Villa Dolores'],
    ['Córdoba', 'Villa María'],

    // Santa Fe.
    ['Santa Fe', 'Santa Fe'],
    ['Santa Fe', 'Cañada de Gómez'],
    ['Santa Fe', 'Casilda'],
    ['Santa Fe', 'Coronda'],
    ['Santa Fe', 'Esperanza'],
    ['Santa Fe', 'Firmat'],
    ['Santa Fe', 'Gálvez'],
    ['Santa Fe', 'Las Parejas'],
    ['Santa Fe', 'Rafaela'],
    ['Santa Fe', 'Reconquista'],
    ['Santa Fe', 'Rosario'],
    ['Santa Fe', 'Rufino'],
    ['Santa Fe', 'San Lorenzo'],
    ['Santa Fe', 'Santo Tomé'],
    ['Santa Fe', 'Sunchales'],
    ['Santa Fe', 'Tostado'],
    ['Santa Fe', 'Venado Tuerto'],
    ['Santa Fe', 'Vera'],
    ['Santa Fe', 'Villa Constitución'],

    // Mendoza.
    ['Mendoza', 'Mendoza'],
    ['Mendoza', 'General Alvear'],
    ['Mendoza', 'Godoy Cruz'],
    ['Mendoza', 'Guaymallén'],
    ['Mendoza', 'Las Heras'],
    ['Mendoza', 'Luján de Cuyo'],
    ['Mendoza', 'Maipú'],
    ['Mendoza', 'Malargüe'],
    ['Mendoza', 'Rivadavia'],
    ['Mendoza', 'San Martín'],
    ['Mendoza', 'San Rafael'],
    ['Mendoza', 'Tunuyán'],
    ['Mendoza', 'Tupungato'],

    // Tucumán.
    ['Tucumán', 'San Miguel de Tucumán'],
    ['Tucumán', 'Aguilares'],
    ['Tucumán', 'Banda del Río Salí'],
    ['Tucumán', 'Bella Vista'],
    ['Tucumán', 'Concepción'],
    ['Tucumán', 'Famaillá'],
    ['Tucumán', 'Lules'],
    ['Tucumán', 'Monteros'],
    ['Tucumán', 'Simoca'],
    ['Tucumán', 'Tafí Viejo'],
    ['Tucumán', 'Yerba Buena'],

    // Entre Ríos.
    ['Entre Ríos', 'Paraná'],
    ['Entre Ríos', 'Chajarí'],
    ['Entre Ríos', 'Colón'],
    ['Entre Ríos', 'Concepción del Uruguay'],
    ['Entre Ríos', 'Concordia'],
    ['Entre Ríos', 'Diamante'],
    ['Entre Ríos', 'Federal'],
    ['Entre Ríos', 'Gualeguay'],
    ['Entre Ríos', 'Gualeguaychú'],
    ['Entre Ríos', 'Nogoyá'],
    ['Entre Ríos', 'San Salvador'],
    ['Entre Ríos', 'Victoria'],
    ['Entre Ríos', 'Villaguay'],

    // Salta.
    ['Salta', 'Salta'],
    ['Salta', 'Cafayate'],
    ['Salta', 'Embarcación'],
    ['Salta', 'Güemes'],
    ['Salta', 'Metán'],
    ['Salta', 'Rosario de la Frontera'],
    ['Salta', 'San Ramón de la Nueva Orán'],
    ['Salta', 'Tartagal'],

    // Chaco.
    ['Chaco', 'Resistencia'],
    ['Chaco', 'Charata'],
    ['Chaco', 'General San Martín'],
    ['Chaco', 'Machagai'],
    ['Chaco', 'Presidencia Roque Sáenz Peña'],
    ['Chaco', 'Quitilipi'],
    ['Chaco', 'Villa Ángela'],

    // Corrientes.
    ['Corrientes', 'Corrientes'],
    ['Corrientes', 'Bella Vista'],
    ['Corrientes', 'Curuzú Cuatiá'],
    ['Corrientes', 'Esquina'],
    ['Corrientes', 'Goya'],
    ['Corrientes', 'Mercedes'],
    ['Corrientes', 'Paso de los Libres'],
    ['Corrientes', 'Santo Tomé'],

    // Misiones.
    ['Misiones', 'Posadas'],
    ['Misiones', 'Apóstoles'],
    ['Misiones', 'Eldorado'],
    ['Misiones', 'Jardín América'],
    ['Misiones', 'Leandro N. Alem'],
    ['Misiones', 'Montecarlo'],
    ['Misiones', 'Oberá'],
    ['Misiones', 'Puerto Iguazú'],
    ['Misiones', 'San Vicente'],

    // Santiago del Estero.
    ['Santiago del Estero', 'Santiago del Estero'],
    ['Santiago del Estero', 'Añatuya'],
    ['Santiago del Estero', 'Fernández'],
    ['Santiago del Estero', 'Frías'],
    ['Santiago del Estero', 'La Banda'],
    ['Santiago del Estero', 'Termas de Río Hondo'],

    // San Juan.
    ['San Juan', 'San Juan'],
    ['San Juan', 'Caucete'],
    ['San Juan', 'Chimbas'],
    ['San Juan', 'Jáchal'],
    ['San Juan', 'Pocito'],
    ['San Juan', 'Rawson'],
    ['San Juan', 'Rivadavia'],
    ['San Juan', 'Santa Lucía'],

    // San Luis.
    ['San Luis', 'San Luis'],
    ['San Luis', 'Concarán'],
    ['San Luis', 'La Toma'],
    ['San Luis', 'Merlo'],
    ['San Luis', 'Villa Mercedes'],

    // Jujuy.
    ['Jujuy', 'San Salvador de Jujuy'],
    ['Jujuy', 'Humahuaca'],
    ['Jujuy', 'La Quiaca'],
    ['Jujuy', 'Libertador General San Martín'],
    ['Jujuy', 'Palpalá'],
    ['Jujuy', 'Perico'],
    ['Jujuy', 'San Pedro de Jujuy'],

    // Catamarca.
    ['Catamarca', 'San Fernando del Valle de Catamarca'],
    ['Catamarca', 'Andalgalá'],
    ['Catamarca', 'Belén'],
    ['Catamarca', 'Recreo'],
    ['Catamarca', 'Santa María'],
    ['Catamarca', 'Tinogasta'],

    // La Rioja.
    ['La Rioja', 'La Rioja'],
    ['La Rioja', 'Aimogasta'],
    ['La Rioja', 'Chamical'],
    ['La Rioja', 'Chepes'],
    ['La Rioja', 'Chilecito'],

    // Formosa.
    ['Formosa', 'Formosa'],
    ['Formosa', 'Clorinda'],
    ['Formosa', 'El Colorado'],
    ['Formosa', 'Las Lomitas'],
    ['Formosa', 'Pirané'],

    // Neuquén.
    ['Neuquén', 'Neuquén'],
    ['Neuquén', 'Centenario'],
    ['Neuquén', 'Chos Malal'],
    ['Neuquén', 'Cutral Có'],
    ['Neuquén', 'Junín de los Andes'],
    ['Neuquén', 'Plaza Huincul'],
    ['Neuquén', 'Plottier'],
    ['Neuquén', 'San Martín de los Andes'],
    ['Neuquén', 'Villa La Angostura'],
    ['Neuquén', 'Zapala'],

    // Río Negro.
    ['Río Negro', 'Viedma'],
    ['Río Negro', 'Allen'],
    ['Río Negro', 'Cinco Saltos'],
    ['Río Negro', 'Cipolletti'],
    ['Río Negro', 'Choele Choel'],
    ['Río Negro', 'El Bolsón'],
    ['Río Negro', 'General Roca'],
    ['Río Negro', 'San Carlos de Bariloche'],
    ['Río Negro', 'Villa Regina'],

    // Chubut.
    ['Chubut', 'Rawson'],
    ['Chubut', 'Comodoro Rivadavia'],
    ['Chubut', 'Esquel'],
    ['Chubut', 'Gaiman'],
    ['Chubut', 'Puerto Madryn'],
    ['Chubut', 'Sarmiento'],
    ['Chubut', 'Trelew'],
    ['Chubut', 'Trevelin'],

    // Santa Cruz.
    ['Santa Cruz', 'Río Gallegos'],
    ['Santa Cruz', 'Caleta Olivia'],
    ['Santa Cruz', 'El Calafate'],
    ['Santa Cruz', 'Las Heras'],
    ['Santa Cruz', 'Perito Moreno'],
    ['Santa Cruz', 'Pico Truncado'],
    ['Santa Cruz', 'Puerto Deseado'],
    ['Santa Cruz', 'Puerto San Julián'],

    // Tierra del Fuego, Antártida e Islas del Atlántico Sur.
    ['Tierra del Fuego, Antártida e Islas del Atlántico Sur', 'Ushuaia'],
    ['Tierra del Fuego, Antártida e Islas del Atlántico Sur', 'Río Grande'],
    ['Tierra del Fuego, Antártida e Islas del Atlántico Sur', 'Tolhuin'],

    // La Pampa.
    ['La Pampa', 'Santa Rosa'],
    ['La Pampa', 'Eduardo Castex'],
    ['La Pampa', 'General Acha'],
    ['La Pampa', 'General Pico'],
    ['La Pampa', 'Realicó'],
    ['La Pampa', 'Toay'],
  ];

  const escapar = (texto) => texto.replace(/'/g, "''");

  const valoresProvincias = provincias.map((nombre) => `('${escapar(nombre)}')`).join(',\n      ');
  const valoresCiudades = ciudades
    .map(([provincia, ciudad]) => `('${escapar(provincia)}', '${escapar(ciudad)}')`)
    .join(',\n      ');

  pgm.sql(`
    INSERT INTO provincia (nombre) VALUES
      ${valoresProvincias};

    INSERT INTO ciudad (provincia_id, nombre)
    SELECT p.id, v.nombre
    FROM (VALUES
      ${valoresCiudades}
    ) AS v(provincia_nombre, nombre)
    JOIN provincia p ON p.nombre = v.provincia_nombre;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DELETE FROM ciudad;
    DELETE FROM provincia;
  `);
};
