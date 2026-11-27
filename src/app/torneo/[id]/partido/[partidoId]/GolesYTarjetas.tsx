import Link from 'next/link';
import type { EventoDelPartido } from '@/services/competencia/obtenerPartido';
import styles from './GolesYTarjetas.module.css';

interface Equipo {
  id: string;
  nombre: string;
}

interface Props {
  local: Equipo;
  visitante: Equipo;
  eventos: EventoDelPartido[];
  jugadorDelPartido: { perfilId: string; nombreVisible: string } | null;
}

interface Linea {
  perfilId: string;
  nombreVisible: string;
  cantidad: number;
  enContra: boolean;
}

/**
 * Agrupa por persona: "Capitán ×3" se lee mejor que tres renglones
 * iguales. Un gol en contra va en la columna del equipo al que **le
 * sumó**, marcado como tal, y no se mezcla con los goles a favor de
 * la misma persona.
 */
function agrupar(eventos: EventoDelPartido[]): Linea[] {
  const lineas = new Map<string, Linea>();
  for (const evento of eventos) {
    const enContra = evento.tipo === 'own_goal';
    const clave = `${evento.perfilId}:${enContra}`;
    const linea = lineas.get(clave);
    if (linea) linea.cantidad += 1;
    else
      lineas.set(clave, {
        perfilId: evento.perfilId,
        nombreVisible: evento.nombreVisible,
        cantidad: 1,
        enContra,
      });
  }
  return [...lineas.values()];
}

function Nombre({ linea }: { linea: Linea }) {
  return (
    <>
      <Link href={`/jugador/${linea.perfilId}`} className={styles.nombre}>
        {linea.nombreVisible}
      </Link>
      {/* Los espacios son para el texto (lector de pantalla, copiar): en
          la fila flex no se ven, el hueco lo pone el gap. */}
      {linea.cantidad > 1 && (
        <>
          {' '}
          <span className={styles.cantidad}>×{linea.cantidad}</span>
        </>
      )}
      {linea.enContra && (
        <>
          {' '}
          <span className={styles.enContra}>(en contra)</span>
        </>
      )}
    </>
  );
}

/**
 * Goleadores, jugador del partido y tarjetas de un partido jugado
 * (`08`, 11, Detalle del partido: "goleadores y tarjetas si se
 * cargaron"). Antes el detalle mostraba sólo el marcador, aunque el
 * organizador hubiera cargado quién hizo los goles.
 *
 * Mismo criterio que los números del jugador: lo que suma (goles,
 * jugador del partido) arriba; las tarjetas aparte, debajo y con menos
 * peso. Sin nada cargado no se dibuja nada: el detalle de un partido
 * sin goleadores no tiene que pedir disculpas por ello.
 */
export function GolesYTarjetas({ local, visitante, eventos, jugadorDelPartido }: Props) {
  const goles = eventos.filter((e) => e.tipo === 'goal' || e.tipo === 'own_goal');
  const tarjetas = eventos.filter((e) => e.tipo === 'yellow_card' || e.tipo === 'red_card');
  if (goles.length === 0 && tarjetas.length === 0 && !jugadorDelPartido) return null;

  // El gol en contra suma al otro equipo.
  const sumaA = (e: EventoDelPartido) =>
    e.tipo === 'own_goal' ? (e.equipoId === local.id ? visitante.id : local.id) : e.equipoId;
  const golesDe = (equipoId: string) => agrupar(goles.filter((e) => sumaA(e) === equipoId));
  const columnas = [
    { equipo: local, lineas: golesDe(local.id) },
    { equipo: visitante, lineas: golesDe(visitante.id) },
  ];

  return (
    <section className={styles.seccion} aria-labelledby="titulo-goles">
      {goles.length > 0 && (
        <>
          <h2 id="titulo-goles" className={styles.titulo}>
            Goles
          </h2>
          <div className={styles.columnas}>
            {columnas.map(({ equipo, lineas }) => (
              <div key={equipo.id} className={styles.columna}>
                <span className={styles.equipo}>{equipo.nombre}</span>
                {lineas.length === 0 ? (
                  <span className={styles.sinGoles}>—</span>
                ) : (
                  <ul className={styles.lista}>
                    {lineas.map((linea) => (
                      <li key={`${linea.perfilId}-${linea.enContra}`}>
                        <span aria-hidden>⚽</span> <Nombre linea={linea} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {jugadorDelPartido && (
        <p className={styles.jugadorDelPartido}>
          <span aria-hidden>⭐ </span>
          <span className={styles.etiquetaJugador}>Jugador del partido</span>{' '}
          <Link href={`/jugador/${jugadorDelPartido.perfilId}`} className={styles.nombre}>
            {jugadorDelPartido.nombreVisible}
          </Link>
        </p>
      )}

      {tarjetas.length > 0 && (
        <div className={styles.tarjetas}>
          <h2 className={styles.tituloTarjetas}>Tarjetas</h2>
          <ul className={styles.listaTarjetas}>
            {tarjetas.map((tarjeta, i) => (
              <li key={`${tarjeta.perfilId}-${tarjeta.tipo}-${i}`}>
                <span aria-hidden>{tarjeta.tipo === 'red_card' ? '🟥' : '🟨'} </span>
                <span className="solo-lector">
                  {tarjeta.tipo === 'red_card' ? 'Roja: ' : 'Amarilla: '}
                </span>
                <Link href={`/jugador/${tarjeta.perfilId}`} className={styles.nombre}>
                  {tarjeta.nombreVisible}
                </Link>
                <span className={styles.equipoTarjeta}>
                  {' · '}
                  {tarjeta.equipoId === local.id ? local.nombre : visitante.nombre}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
