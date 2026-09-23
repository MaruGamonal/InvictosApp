import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerResumenParaPublicar } from '@/services/torneos/obtenerResumenParaPublicar';
import { esErrorDeAplicacion } from '@/lib/errores';
import { conNombreProducto } from '@/lib/nombreProducto';
import { BotonVerificarOrganizacion } from '@/components/BotonVerificarOrganizacion';
import { PanelPublicarInicial } from './PanelPublicarInicial';
import styles from '@/app/ingresar/pagina.module.css';
import pasoStyles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Listo para publicar') };

/**
 * UC-16/UC-18 — Último paso del alta de torneo (Flujo 3 del paquete de
 * diseño): publicar pasa el torneo de `draft` a `registration_open`.
 * Si ya se publicó (por ejemplo, volviendo atrás en el navegador),
 * manda directo a la gestión en vez de repetir el paso.
 */
export default async function PaginaPublicarInicial({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  let resumen;
  try {
    resumen = await obtenerResumenParaPublicar({ torneoId: id }, contexto);
  } catch (error) {
    if (esErrorDeAplicacion(error) && error.codigo === 'SIN_PERMISO') redirect(`/torneo/${id}`);
    throw error;
  }

  if (resumen.torneoEstado !== 'draft') redirect(`/torneo/${id}/gestionar`);

  return (
    <div className={styles.pagina}>
      <div className={styles.tarjeta}>
        <h1 className={`fuente-display ${styles.titulo}`}>Listo para publicar</h1>
        <p className={pasoStyles.breadcrumb}>· {resumen.ciudadNombre}</p>

        {resumen.organizacionVerificada ? (
          <p className={pasoStyles.avisoExito}>
            Tu organización está verificada: aparece en el descubrimiento apenas publiques.
          </p>
        ) : (
          <div className={pasoStyles.bloqueVerificacion}>
            <p className={pasoStyles.avisoInfo}>
              {resumen.limitePublicadosAlcanzado
                ? 'Mientras tu organización no esté verificada podés tener un solo torneo publicado a la vez, y ya tenés uno. Verificala para publicar este.'
                : 'Tu organización todavía no está verificada: el torneo se va a poder compartir por link, pero no va a aparecer en las búsquedas hasta que la verifiques.'}
            </p>
            {/* D-51 pide ofrecer la verificación en el mismo lugar donde
                se da la noticia, no mandar a buscarla a otra pantalla. */}
            <BotonVerificarOrganizacion
              organizacionId={resumen.organizacionId}
              soyTitular={resumen.soyTitular}
              variante="secundaria"
            />
          </div>
        )}

        <PanelPublicarInicial
          torneoId={id}
          organizacionId={resumen.organizacionId}
          soyTitular={resumen.soyTitular}
        />
      </div>
    </div>
  );
}
