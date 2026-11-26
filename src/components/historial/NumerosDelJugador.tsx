import type { TorneoJugado } from './tipos';
import styles from './NumerosDelJugador.module.css';

/**
 * Los números de toda la carrera de un jugador, sumados torneo por
 * torneo: goles, veces jugador del partido y tarjetas. Va en su perfil
 * (`/perfil`) y en la ficha pública (`/jugador/[id]`).
 *
 * Acá el cero sí se muestra: en un total, "0 rojas" es un dato (y uno
 * del que el jugador puede estar orgulloso). En la línea de cada torneo
 * del historial, en cambio, una fila de ceros es ruido y se omite.
 *
 * Los partidos jugados sólo aparecen si hay alguno cargado: la
 * alineación es opcional y un "0 partidos" se leería como "no jugó".
 */
export function NumerosDelJugador({ historial }: { historial: TorneoJugado[] }) {
  const total = historial.reduce(
    (suma, torneo) => ({
      partidos: suma.partidos + torneo.partidosJugados,
      goles: suma.goles + torneo.goles,
      jugadorDelPartido: suma.jugadorDelPartido + torneo.vecesJugadorDelPartido,
      amarillas: suma.amarillas + torneo.tarjetasAmarillas,
      rojas: suma.rojas + torneo.tarjetasRojas,
    }),
    { partidos: 0, goles: 0, jugadorDelPartido: 0, amarillas: 0, rojas: 0 },
  );

  const numeros = [
    ...(total.partidos > 0
      ? [{ clave: 'partidos', icono: '🏟️', valor: total.partidos, etiqueta: 'Partidos' }]
      : []),
    { clave: 'goles', icono: '⚽', valor: total.goles, etiqueta: 'Goles' },
    {
      clave: 'jugadorDelPartido',
      icono: '⭐',
      valor: total.jugadorDelPartido,
      etiqueta: 'Jugador del partido',
    },
    { clave: 'amarillas', icono: '🟨', valor: total.amarillas, etiqueta: 'Amarillas' },
    { clave: 'rojas', icono: '🟥', valor: total.rojas, etiqueta: 'Rojas' },
  ];

  return (
    <dl className={styles.numeros}>
      {numeros.map((numero) => (
        <div key={numero.clave} className={styles.numero}>
          <dt className={styles.etiqueta}>
            <span aria-hidden>{numero.icono} </span>
            {numero.etiqueta}
          </dt>
          <dd className={styles.valor}>{numero.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
