import { notFound } from 'next/navigation';
import { Badge } from '@/components/Badge';
import { Escudo } from '@/components/Escudo';
import { Marcador } from '@/components/Marcador';
import { FilaPartido } from '@/components/FilaPartido';
import { EncabezadoTabla, FilaTabla } from '@/components/FilaTabla';
import { TarjetaTorneo } from '@/components/TarjetaTorneo';
import { ContenedorPublicidad } from '@/components/ContenedorPublicidad';
import { EstadoVacio } from '@/components/EstadoVacio';
import { listarTodasLasEtiquetas } from '@/lib/etiquetas';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import { CabeceraDeModo } from '@/components/marca/CabeceraDeModo';
import { SelectorDeModo } from '@/components/marca/SelectorDeModo';
import { HojaDeOpciones } from '@/components/HojaDeOpciones';
import { claseDeOpcion, CuerpoDeOpcion } from '@/components/_opcionesDeHoja';
import { CambiarAcento } from './CambiarAcento';
import styles from './pagina.module.css';

const TOKENS_DE_COLOR = [
  '--ink-900',
  '--ink-800',
  '--ink-700',
  '--acento',
  '--acento-oscuro',
  '--exito',
  '--informacion',
  '--advertencia',
  '--error',
  '--borde-sutil',
  '--fondo-pagina',
];

/**
 * Catálogo visual del sistema de diseño (T6, "cómo demostrarlo"): todos
 * los componentes clave en sus variantes, y los badges de todos los
 * estados de `04` con su etiqueta.
 *
 * **No es una pantalla del producto, y fuera de desarrollo no existe.**
 * Era una ruta pública: cualquiera que escribiera la URL veía el
 * sistema de diseño entero, con los nombres internos de todos los
 * estados. Eso no le sirve a nadie en producción y contradice que la
 * aplicación se sienta terminada (auditoría de wording, hallazgo #003).
 *
 * En desarrollo sigue entera, que es donde sirve: mirar un componente
 * en sus variantes sin levantar nada aparte.
 */
export default function PaginaCatalogo() {
  if (process.env.NODE_ENV === 'production') notFound();

  const etiquetas = listarTodasLasEtiquetas();

  return (
    <main className={styles.pagina}>
      <h1 className="fuente-display">Catálogo de componentes — {NOMBRE_PRODUCTO}</h1>
      <CambiarAcento />

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Tokens de color</h2>
        <div className={styles.swatches}>
          {TOKENS_DE_COLOR.map((token) => (
            <div key={token} className={styles.swatch}>
              <div className={styles.color} style={{ background: `var(${token})` }} />
              {token}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Badges — todos los estados de 04</h2>
        <div className={styles.filaDeChips}>
          {etiquetas.map(({ campo, valor }) => (
            <Badge key={`${campo}.${valor}`} campo={campo} valor={valor} />
          ))}
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Escudo — con y sin imagen</h2>
        <div className={styles.filaDeChips}>
          <Escudo nombre="Deportivo Rivadavia" />
          <Escudo nombre="Boca" src="https://picsum.photos/seed/boca/64" />
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Marcador</h2>
        <Marcador
          nombreLocal="Deportivo Rivadavia"
          nombreVisitante="Estudiantes"
          golesLocal={2}
          golesVisitante={1}
          enVivo
        />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Fila de partido — las cuatro variantes</h2>
        <div className={styles.listaVertical}>
          <FilaPartido
            estado="scheduled"
            equipoLocal={{ nombre: 'Deportivo Rivadavia' }}
            equipoVisitante={{ nombre: 'Estudiantes' }}
            fechaProgramadaTexto="Sáb 14, 18:00"
          />
          <FilaPartido
            estado="played"
            equipoLocal={{ nombre: 'Deportivo Rivadavia' }}
            equipoVisitante={{ nombre: 'Estudiantes' }}
            golesLocal={2}
            golesVisitante={1}
          />
          <FilaPartido
            estado="walkover"
            equipoLocal={{ nombre: 'Deportivo Rivadavia' }}
            equipoVisitante={{ nombre: 'Estudiantes' }}
            golesLocal={3}
            golesVisitante={0}
          />
          <FilaPartido
            estado="postponed"
            equipoLocal={{ nombre: 'Deportivo Rivadavia' }}
            equipoVisitante={{ nombre: 'Estudiantes' }}
          />
          <FilaPartido
            estado="played"
            equipoLocal={{ nombre: 'Club Atlético Los Pibes del Barrio Norte' }}
            equipoVisitante={{ nombre: 'Asociación Deportiva y Cultural San Martín' }}
            golesLocal={12}
            golesVisitante={3}
          />
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Tabla de posiciones — números de distinto largo</h2>
        <div>
          <EncabezadoTabla />
          <FilaTabla
            posicion={1}
            equipo={{ nombre: 'Deportivo Rivadavia' }}
            partidosJugados={10}
            ganados={8}
            empatados={1}
            perdidos={1}
            diferenciaGol={15}
            puntos={25}
            clasifica
          />
          <FilaTabla
            posicion={2}
            equipo={{ nombre: 'Estudiantes' }}
            partidosJugados={10}
            ganados={2}
            empatados={3}
            perdidos={5}
            diferenciaGol={-8}
            puntos={9}
          />
          <FilaTabla
            posicion={3}
            equipo={{ nombre: 'Club Atlético Los Pibes del Barrio Norte' }}
            partidosJugados={10}
            ganados={3}
            empatados={2}
            perdidos={5}
            diferenciaGol={-2}
            puntos={11}
            ajustePuntos={-3}
            ganadosPorPresentacion={1}
          />
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Tarjeta de torneo</h2>
        <TarjetaTorneo
          nombre="Apertura Amateur La Plata"
          ciudad="La Plata"
          modalidad="f5"
          estado="registration_open"
        />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Contenedor de publicidad</h2>
        {/* Con un hijo de muestra: sin anuncio el contenedor no se
            renderiza, y una sección vacía en la galería no exhibe nada. */}
        <ContenedorPublicidad>
          <div
            style={{
              minHeight: 90,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--color-superficie)',
            }}
          >
            Acá iría el anuncio
          </div>
        </ContenedorPublicidad>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Estado vacío</h2>
        <EstadoVacio
          mensaje="Todavía no hay torneos publicados en tu ciudad."
          textoAccion="Ver los de la provincia"
        />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Hoja de opciones — el chip del modo</h2>
        {/* Sobre el hero oscuro, que es donde vive: el disparador usa los
            tokens de identidad y sobre fondo claro no se lee como es. */}
        <div
          style={{
            background: 'var(--identidad-fondo)',
            padding: '18px var(--espacio-pantalla-x)',
            borderRadius: 'var(--radio-tarjeta)',
          }}
        >
          <SelectorDeModo modoActual="jugador" />
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Los dos colores de cabecera, uno al lado del otro</h2>
        {/* El punto es compararlos: cada uno solo se ve bien, y así fue
            como se desparramaron cinco cabeceras de cada color sin que
            el color significara nada. */}
        <div style={{ display: 'grid', gap: 10 }}>
          {(['--cabecera-jugador', '--cabecera-organizador'] as const).map((token) => (
            <div
              key={token}
              style={{
                background: `var(${token})`,
                color: 'var(--identidad-texto)',
                borderRadius: 'var(--radio-tarjeta)',
                padding: '18px var(--espacio-pantalla-x)',
                font: '700 13px/1 var(--fuente-texto)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {token.replace('--cabecera-', '')}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Cabecera de modo — modo jugador</h2>
        {/* Sin organización, el control del modo ocupa la fila entera.
            Está puesto acá porque esa regla es un `:only-child`, y una
            regla que no aplica no avisa: se ve igual de bien rota. */}
        <CabeceraDeModo modo="jugador" nombreUsuario="Pato" puedeCambiarDeModo />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>
          Cabecera de modo — organizador, con un nombre largo
        </h2>
        {/* El caso que importa mirar: el chip del modo arriba, al lado de
            la campana, y la fila entera para la organización, con un
            nombre que no entra para ver que se recorta. */}
        <CabeceraDeModo
          modo="organizador"
          nombreUsuario="Mariela"
          puedeCambiarDeModo
          controlDeOrganizacion={
            <HojaDeOpciones
              etiqueta="Complejo Deportivo San Martín Norte"
              descripcionDelControl="Organización que estás gestionando"
              titulo="Elegí qué organización gestionar"
            >
              <span className={claseDeOpcion(true)} aria-current="true">
                <CuerpoDeOpcion
                  titulo="Complejo Deportivo San Martín Norte"
                  detalle="La que estás gestionando ahora."
                  elegida
                />
              </span>
            </HojaDeOpciones>
          }
        />
      </section>
    </main>
  );
}
