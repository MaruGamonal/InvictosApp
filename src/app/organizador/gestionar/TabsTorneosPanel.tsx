'use client';

import { useState } from 'react';
import { EstadoVacio } from '@/components/EstadoVacio';
import type { TorneoPanelOrganizador } from '@/services/organizadores/obtenerPanelOrganizador';
import { TarjetaTorneoPanel } from './TarjetaTorneoPanel';
import styles from './TabsTorneosPanel.module.css';

type Pestana = 'activos' | 'proximos' | 'finalizados';

const ETIQUETAS: Record<Pestana, string> = {
  activos: 'Activos',
  proximos: 'Próximos',
  finalizados: 'Finalizados',
};

const MENSAJE_VACIO: Record<Pestana, string> = {
  activos: 'Ningún torneo en curso ahora mismo.',
  proximos: 'No hay torneos por comenzar.',
  finalizados: 'Todavía no finalizó ningún torneo.',
};

export interface TabsTorneosPanelProps {
  activos: TorneoPanelOrganizador[];
  proximos: TorneoPanelOrganizador[];
  finalizados: TorneoPanelOrganizador[];
}

/** Tabs Activos/Próximos/Finalizados del Home del panel de Organizador. */
export function TabsTorneosPanel({ activos, proximos, finalizados }: TabsTorneosPanelProps) {
  const [pestana, setPestana] = useState<Pestana>(
    activos.length > 0 ? 'activos' : proximos.length > 0 ? 'proximos' : 'finalizados',
  );

  const listas: Record<Pestana, TorneoPanelOrganizador[]> = { activos, proximos, finalizados };
  const activa = listas[pestana];

  return (
    <div>
      <div className={styles.nav} role="tablist" aria-label="Torneos por estado">
        {(Object.keys(ETIQUETAS) as Pestana[]).map((clave) => (
          <button
            key={clave}
            type="button"
            role="tab"
            aria-selected={pestana === clave}
            className={pestana === clave ? styles.pestanaActiva : styles.pestana}
            onClick={() => setPestana(clave)}
          >
            {ETIQUETAS[clave]} ({listas[clave].length})
          </button>
        ))}
      </div>

      {activa.length === 0 ? (
        <EstadoVacio mensaje={MENSAJE_VACIO[pestana]} />
      ) : (
        <div className={styles.lista}>
          {activa.map((torneo) => (
            <TarjetaTorneoPanel key={torneo.id} torneo={torneo} />
          ))}
        </div>
      )}
    </div>
  );
}
