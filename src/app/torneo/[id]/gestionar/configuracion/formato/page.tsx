import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerGestionCacheada } from '../../_datos';
import { FormularioDefinirFormato } from '../../FormularioDefinirFormato';
import { CabeceraDeSeccion } from '../CabeceraDeSeccion';
import { SECCIONES_CONFIGURACION } from '../_secciones';
import stylesCompartidos from '../../pagina.module.css';
import styles from '../pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto(SECCIONES_CONFIGURACION.formato) };

/**
 * UC-17 — Las fases y grupos del torneo. Una vez definidas no se editan
 * desde acá: cambiarlas con un fixture generado rehace todos los
 * partidos, así que la pantalla muestra lo que hay y el cambio pasa por
 * el Fixture.
 */
export default async function PaginaFormato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gestion = await obtenerGestionCacheada(id);

  return (
    <div className={styles.pagina}>
      <CabeceraDeSeccion torneoId={id} seccion="formato" />
      {gestion.fases.length === 0 ? (
        <FormularioDefinirFormato torneoId={id} formatoElegido={gestion.formato} />
      ) : (
        <div className={stylesCompartidos.lista}>
          {gestion.fases.map((fase) => (
            <div key={fase.id} className={stylesCompartidos.filaPendiente}>
              <span>{fase.nombre}</span>
              <span className={stylesCompartidos.rolIntegrante}>
                {fase.tipoFase === 'league' ? 'Liga' : 'Eliminación directa'}
                {fase.cantidadGrupos > 1 ? ` · ${fase.cantidadGrupos} zonas` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
