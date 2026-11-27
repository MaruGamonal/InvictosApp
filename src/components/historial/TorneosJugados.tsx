import Link from 'next/link';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import type { TorneoJugado } from './tipos';
import styles from './TorneosJugados.module.css';

function comoAño(fechaIso: string | null): string | null {
  if (!fechaIso) return null;
  const año = new Date(fechaIso).getFullYear();
  return Number.isNaN(año) ? null : String(año);
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/**
 * UC-38 — El historial torneo por torneo: con qué equipo, y lo que hizo
 * en cada uno (partidos, goles, jugador del partido, tarjetas). Lo usan
 * la ficha pública del jugador y su propio perfil.
 *
 * Cada marca dice qué es también para el lector de pantalla: "⭐ 2"
 * solo, leído en voz alta, es "estrella dos".
 */
export function TorneosJugados({ historial }: { historial: TorneoJugado[] }) {
  return (
    <ul className={styles.lista}>
      {historial.map((torneo) => (
        <li key={`${torneo.torneoId}-${torneo.equipoId}`} className={styles.torneo}>
          <Link href={`/torneo/${torneo.torneoId}`} className={styles.enlace}>
            <div className={styles.cabecera}>
              <span className={styles.nombre}>{torneo.torneoNombre}</span>
              <span className={styles.anio}>{comoAño(torneo.fechaInicio)}</span>
            </div>
            <span className={styles.detalle}>
              {torneo.equipoNombre}
              {torneo.ciudadNombre && ` · ${torneo.ciudadNombre}`}
              {' · '}
              {obtenerEtiqueta('torneo.modalidad', torneo.modalidad).etiqueta}
            </span>
            {/* Sólo lo que tiene algo que decir: una fila de ceros no es
                un dato, es ruido. Cero partidos tampoco: la alineación es
                opcional, y se leería como que no jugó. */}
            {(torneo.partidosJugados > 0 ||
              torneo.goles > 0 ||
              torneo.tarjetasAmarillas > 0 ||
              torneo.tarjetasRojas > 0 ||
              torneo.vecesJugadorDelPartido > 0) && (
              <span className={styles.marcas}>
                {torneo.partidosJugados > 0 && (
                  <span>{plural(torneo.partidosJugados, 'partido', 'partidos')}</span>
                )}
                {torneo.goles > 0 && (
                  <span>
                    <span aria-hidden>⚽ </span>
                    {plural(torneo.goles, 'gol', 'goles')}
                  </span>
                )}
                {torneo.vecesJugadorDelPartido > 0 && (
                  <span>
                    <span aria-hidden>⭐ </span>
                    {torneo.vecesJugadorDelPartido}
                    <span className="solo-lector"> veces jugador del partido</span>
                  </span>
                )}
                {/* Las tarjetas, aparte y a la derecha: no son un logro. */}
                {(torneo.tarjetasAmarillas > 0 || torneo.tarjetasRojas > 0) && (
                  <span className={styles.tarjetas}>
                    {torneo.tarjetasAmarillas > 0 && (
                      <span className={styles.tarjeta}>
                        <span aria-hidden>🟨 </span>
                        {torneo.tarjetasAmarillas}
                        <span className="solo-lector">
                          {torneo.tarjetasAmarillas === 1 ? ' amarilla' : ' amarillas'}
                        </span>
                      </span>
                    )}
                    {torneo.tarjetasRojas > 0 && (
                      <span className={styles.tarjeta}>
                        <span aria-hidden>🟥 </span>
                        {torneo.tarjetasRojas}
                        <span className="solo-lector">
                          {torneo.tarjetasRojas === 1 ? ' roja' : ' rojas'}
                        </span>
                      </span>
                    )}
                  </span>
                )}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
