import Link from 'next/link';
import { Escudo } from './Escudo';
import { tiempoRelativo } from '@/lib/tiempoRelativo';
import styles from './TarjetaActividad.module.css';

interface TorneoActividad {
  id: string;
  nombre: string;
  imagenUrl: string | null;
}

interface EquipoActividad {
  id: string;
  nombre: string;
  escudoUrl: string | null;
}

/**
 * Mismo shape que `ItemActividad` de `obtenerActividad.ts` (T32/UC-44),
 * declarado acá en vez de importado: los componentes no pueden depender
 * de `services` (`boundaries/dependencies`, T6) — el tipado estructural
 * de TypeScript hace que un `ItemActividad` real encaje acá sin cast.
 */
export type ItemActividadTarjeta =
  | { tipo: 'tournament_published'; id: string; fecha: string; torneo: TorneoActividad }
  | { tipo: 'tournament_started'; id: string; fecha: string; torneo: TorneoActividad }
  | { tipo: 'tournament_finished'; id: string; fecha: string; torneo: TorneoActividad }
  | {
      tipo: 'result_published';
      id: string;
      fecha: string;
      partidoId: string;
      torneo: TorneoActividad;
      equipoLocal: EquipoActividad;
      equipoVisitante: EquipoActividad;
      golesLocal: number;
      golesVisitante: number;
      jugadorDelPartido: { perfilId: string; nombreVisible: string } | null;
    }
  | {
      tipo: 'team_joined_tournament';
      id: string;
      fecha: string;
      torneo: TorneoActividad;
      equipo: EquipoActividad;
    };

/**
 * UC-44 — Una fila del feed de actividad. Cada tipo de item resuelve acá
 * su propio título, imagen y a dónde navega (`obtenerActividad.ts` trae
 * el dato crudo; esto es lo que sabe convertirlo en algo legible). Todos
 * los tipos hoy resuelven al mismo lugar, la ficha del torneo — no hay
 * página propia de partido todavía (mismo límite real que `FilaPartido`
 * y `_enlace.ts`).
 */
export function TarjetaActividad({ item }: { item: ItemActividadTarjeta }) {
  const href = `/torneo/${item.torneo.id}`;

  if (item.tipo === 'result_published') {
    return (
      <Link href={href} className={styles.tarjeta}>
        <Escudo src={item.torneo.imagenUrl} nombre={item.torneo.nombre} tamano={40} />
        <div className={styles.contenido}>
          <span className={styles.torneo}>{item.torneo.nombre}</span>
          <span className={styles.resultado}>
            {item.equipoLocal.nombre} {item.golesLocal} - {item.golesVisitante}{' '}
            {item.equipoVisitante.nombre}
          </span>
          {item.jugadorDelPartido && (
            <span className={styles.jugadorDelPartido}>
              ⭐ {item.jugadorDelPartido.nombreVisible}
            </span>
          )}
          <span className={styles.meta}>{tiempoRelativo(item.fecha)}</span>
        </div>
      </Link>
    );
  }

  if (item.tipo === 'team_joined_tournament') {
    return (
      <Link href={href} className={styles.tarjeta}>
        <Escudo src={item.equipo.escudoUrl} nombre={item.equipo.nombre} tamano={40} />
        <div className={styles.contenido}>
          <span className={styles.texto}>
            <strong>{item.equipo.nombre}</strong> se sumó a {item.torneo.nombre}
          </span>
          <span className={styles.meta}>{tiempoRelativo(item.fecha)}</span>
        </div>
      </Link>
    );
  }

  const TEXTOS: Record<
    'tournament_published' | 'tournament_started' | 'tournament_finished',
    string
  > = {
    tournament_published: 'abrió inscripciones',
    tournament_started: 'empezó a jugarse',
    tournament_finished: 'terminó',
  };

  return (
    <Link href={href} className={styles.tarjeta}>
      <Escudo src={item.torneo.imagenUrl} nombre={item.torneo.nombre} tamano={40} />
      <div className={styles.contenido}>
        <span className={styles.texto}>
          <strong>{item.torneo.nombre}</strong> {TEXTOS[item.tipo]}
        </span>
        <span className={styles.meta}>{tiempoRelativo(item.fecha)}</span>
      </div>
    </Link>
  );
}
