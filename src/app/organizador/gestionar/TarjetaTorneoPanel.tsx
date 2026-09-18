import Link from 'next/link';
import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import type { TorneoPanelOrganizador } from '@/services/organizadores/obtenerPanelOrganizador';
import styles from './TarjetaTorneoPanel.module.css';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Tarjeta de torneo del Home del panel de Organizador: a diferencia de
 * `TarjetaTorneoResumen` (fila compacta de Inicio), esta trae lo que
 * hace falta para decidir qué gestionar hoy sin entrar — progreso de
 * fecha, próximo partido, último resultado, y avisos puntuales.
 */
export function TarjetaTorneoPanel({ torneo }: { torneo: TorneoPanelOrganizador }) {
  return (
    <Link href={`/torneo/${torneo.id}/gestionar/resumen`} className={styles.tarjeta}>
      <div className={styles.cabecera}>
        <Escudo src={torneo.imagenUrl} nombre={torneo.nombre} tamano={44} />
        <div className={styles.cabeceraTexto}>
          <span className={styles.nombre}>{torneo.nombre}</span>
          <span className={styles.meta}>
            {obtenerEtiqueta('torneo.categoriaGenero', torneo.categoriaGenero).etiqueta} ·{' '}
            {obtenerEtiqueta('torneo.modalidad', torneo.modalidad).etiqueta}
          </span>
        </div>
        <Badge campo="torneo.estado" valor={torneo.estado} />
      </div>

      {(torneo.inscripcionesPendientes > 0 || torneo.resultadosSinCargar > 0) && (
        <div className={styles.avisos}>
          {torneo.inscripcionesPendientes > 0 && (
            <span className={styles.aviso}>
              {torneo.inscripcionesPendientes === 1
                ? '1 inscripción pendiente'
                : `${torneo.inscripcionesPendientes} inscripciones pendientes`}
            </span>
          )}
          {torneo.resultadosSinCargar > 0 && (
            <span className={styles.aviso}>
              {torneo.resultadosSinCargar === 1
                ? '1 resultado sin cargar'
                : `${torneo.resultadosSinCargar} resultados sin cargar`}
            </span>
          )}
        </div>
      )}

      {torneo.progreso && torneo.progreso.fechaTotal > 0 && (
        <div className={styles.progreso}>
          <div className={styles.progresoBarraFondo}>
            <div
              className={styles.progresoBarra}
              style={{
                width: `${Math.min(100, (torneo.progreso.fechaActual / torneo.progreso.fechaTotal) * 100)}%`,
              }}
            />
          </div>
          <span className={styles.progresoTexto}>
            Fecha {torneo.progreso.fechaActual} de {torneo.progreso.fechaTotal}
          </span>
        </div>
      )}

      {torneo.proximoPartido && (
        <div className={styles.filaPartido}>
          <span className={styles.filaPartidoEtiqueta}>Próximo</span>
          <span className={styles.filaPartidoTexto}>
            {torneo.proximoPartido.equipoLocalNombre} vs{' '}
            {torneo.proximoPartido.equipoVisitanteNombre}
            {torneo.proximoPartido.fechaHoraProgramada &&
              ` · ${FORMATO_FECHA.format(new Date(torneo.proximoPartido.fechaHoraProgramada))}`}
          </span>
        </div>
      )}

      {torneo.ultimoResultado && (
        <div className={styles.filaPartido}>
          <span className={styles.filaPartidoEtiqueta}>Último resultado</span>
          <span className={styles.filaPartidoTexto}>
            {torneo.ultimoResultado.equipoLocalNombre} {torneo.ultimoResultado.golesLocal} -{' '}
            {torneo.ultimoResultado.golesVisitante} {torneo.ultimoResultado.equipoVisitanteNombre}
          </span>
        </div>
      )}

      <div className={styles.pie}>
        <span className={styles.inscriptos}>
          {torneo.inscriptos} / {torneo.cupoEquipos} equipos
        </span>
        <span className={styles.enlace}>Gestionar torneo →</span>
      </div>
    </Link>
  );
}
