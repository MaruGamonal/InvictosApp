import { Badge } from '@/components/Badge';
import { Escudo } from '@/components/Escudo';
import { Marcador } from '@/components/Marcador';
import { FilaPartido } from '@/components/FilaPartido';
import { EncabezadoTabla, FilaTabla } from '@/components/FilaTabla';
import { TarjetaTorneo } from '@/components/TarjetaTorneo';
import { ContenedorPublicidad } from '@/components/ContenedorPublicidad';
import { EstadoVacio } from '@/components/EstadoVacio';
import { listarTodasLasEtiquetas } from '@/lib/etiquetas';
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
 * estados de `04` con su etiqueta. No es una pantalla del producto.
 */
export default function PaginaCatalogo() {
  const etiquetas = listarTodasLasEtiquetas();

  return (
    <main className={styles.pagina}>
      <h1 className="fuente-display">Catálogo de componentes — INVICTOS</h1>
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
        <ContenedorPublicidad />
      </section>

      <section className={styles.seccion}>
        <h2 className={styles.tituloSeccion}>Estado vacío</h2>
        <EstadoVacio
          mensaje="Todavía no hay torneos publicados en tu ciudad."
          textoAccion="Ver los de la provincia"
        />
      </section>
    </main>
  );
}
