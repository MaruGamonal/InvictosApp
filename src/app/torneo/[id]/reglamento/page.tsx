import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EstadoVacio } from '@/components/EstadoVacio';
import { obtenerFichaOFallar, obtenerReglamentosCacheados } from '../_datos';
import styles from './pagina.module.css';

/**
 * UC-51 — Reglamento vigente (`10`, sección 5): siempre el que rige
 * hoy, nunca el que regía al inscribirse (`11`, T21). Un torneo sin
 * reglamento no tiene esta sección — la ruta no se ofrece en la
 * navegación (`layout.tsx`), y si se la pide igual, 404.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ficha = await obtenerFichaOFallar(id);
  return {
    title: `Reglamento — ${ficha.nombre} — INVICTOS`,
    openGraph: { title: ficha.nombre, description: 'Reglamento del torneo' },
  };
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function PaginaReglamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reglamentos = await obtenerReglamentosCacheados(id);
  if (!reglamentos) notFound();

  const vigente = reglamentos.find((r) => r.estado === 'current');
  const anteriores = reglamentos.filter((r) => r.estado !== 'current');

  if (!vigente) {
    return <EstadoVacio mensaje="Este torneo todavía no publicó su reglamento." />;
  }

  return (
    <div className={styles.pagina}>
      <p className={styles.version}>
        Versión {vigente.numeroVersion} — vigente desde el{' '}
        {formatearFecha(vigente.fechaPublicacion)}
      </p>

      {vigente.texto && <div className={styles.texto}>{vigente.texto}</div>}
      {vigente.archivoUrl && (
        <a
          href={vigente.archivoUrl}
          target="_blank"
          rel="noreferrer"
          className={styles.enlaceArchivo}
        >
          Ver archivo adjunto
        </a>
      )}

      {anteriores.length > 0 && (
        <section className={styles.historial}>
          <h2 className={styles.tituloHistorial}>Versiones anteriores</h2>
          <ul>
            {anteriores.map((r) => (
              <li key={r.numeroVersion}>
                Versión {r.numeroVersion} — publicada el {formatearFecha(r.fechaPublicacion)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
