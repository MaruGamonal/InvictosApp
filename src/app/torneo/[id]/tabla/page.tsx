import type { Metadata } from 'next';
import { EncabezadoTabla, FilaTabla } from '@/components/FilaTabla';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerFichaOFallar, obtenerTablaCacheada } from '../_datos';
import styles from './pagina.module.css';

/**
 * UC-35 — Tabla de posiciones (`10`, sección 5): `puntos + ajuste_puntos`
 * y después los criterios de desempate configurados, con las dos
 * columnas de puntos visibles por separado y marca de provisorio
 * cuando corresponde (T15/T21).
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [ficha, tabla] = await Promise.all([obtenerFichaOFallar(id), obtenerTablaCacheada(id)]);
  const lider = tabla?.[0]?.filas[0];
  const descripcion = lider ? `${lider.equipoNombre} está primero` : 'Tabla de posiciones';

  return {
    title: `Tabla — ${ficha.nombre} — INVICTOS`,
    description: descripcion,
    openGraph: { title: ficha.nombre, description: descripcion },
  };
}

export default async function PaginaTabla({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tabla = await obtenerTablaCacheada(id);

  if (!tabla || tabla.every((grupo) => grupo.filas.length === 0)) {
    return <EstadoVacio mensaje="Todavía no hay tabla de posiciones para este torneo." />;
  }

  return (
    <div className={styles.pagina}>
      {tabla.map((grupo) => (
        <section key={grupo.grupoId} className={styles.grupo}>
          {tabla.length > 1 && <h2 className={styles.tituloGrupo}>{grupo.nombre}</h2>}
          {grupo.provisorio && (
            <p className={styles.provisorio}>
              Tabla provisoria: hay un resultado en revisión que todavía puede cambiarla.
            </p>
          )}
          <div className={styles.tabla}>
            <EncabezadoTabla />
            {grupo.filas.map((fila, indice) => (
              <FilaTabla
                key={fila.equipoId}
                posicion={indice + 1}
                equipo={{ nombre: fila.equipoNombre, escudoUrl: fila.equipoEscudoUrl }}
                partidosJugados={fila.partidosJugados}
                ganados={fila.ganados}
                empatados={fila.empatados}
                perdidos={fila.perdidos}
                diferenciaGol={fila.diferenciaGol}
                puntos={fila.puntos + fila.ajustePuntos}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
