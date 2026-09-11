import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioReglamentoInicial } from './FormularioReglamentoInicial';
import styles from '@/app/ingresar/pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Reglamento') };

/**
 * UC-16/UC-51 — Segundo paso del alta de torneo (Flujo 3 del paquete de
 * diseño): reglamento opcional, texto y/o PDF. Se puede omitir — el
 * torneo sigue en `draft` de cualquier forma hasta que se publica en el
 * paso siguiente.
 */
export default async function PaginaReglamentoInicial({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  return (
    <div className={styles.pagina}>
      <div className={styles.tarjeta}>
        <h1 className={`fuente-display ${styles.titulo}`}>
          Reglamento <span className={styles.textoOpcional}>(opcional)</span>
        </h1>
        <p className={styles.texto}>
          Es el texto contra el que se resuelve cualquier disputa. Cada cambio queda versionado.
        </p>
        <FormularioReglamentoInicial torneoId={id} />
      </div>
    </div>
  );
}
