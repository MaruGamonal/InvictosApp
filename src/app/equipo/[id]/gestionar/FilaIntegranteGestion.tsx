'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/Badge';
import { Escudo } from '@/components/Escudo';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
  perfilId: string;
  nombreVisible: string;
  fotoUrl: string | null;
  rolesEquipo: Array<'captain' | 'delegate' | 'player' | 'coach'>;
  esUnoMismo: boolean;
  esCapitanViewer: boolean;
}

const ROLES_DESIGNABLES: Array<{
  rol: 'captain' | 'delegate' | 'coach';
  etiqueta: string;
  confirmar?: string;
}> = [
  {
    rol: 'captain',
    etiqueta: 'Hacer capitán',
    confirmar: '¿Transferir la capitanía a esta persona? Vos dejás de ser capitán.',
  },
  { rol: 'delegate', etiqueta: 'Hacer delegado' },
  { rol: 'coach', etiqueta: 'Hacer DT' },
];

/** Fila de plantel en la gestión del equipo: badges de rol con quitar en línea, o "Dejar equipo" sobre uno mismo. */
export function FilaIntegranteGestion({
  equipoId,
  perfilId,
  nombreVisible,
  fotoUrl,
  rolesEquipo,
  esUnoMismo,
  esCapitanViewer,
}: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [masOpciones, setMasOpciones] = useState(false);
  const esCapitan = rolesEquipo.includes('captain');

  async function llamar(clave: string, url: string, body: object) {
    setEnviando(clave);
    setError(null);
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo aplicar. Probá de nuevo.');
        setEnviando(null);
        return;
      }
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(null);
    }
  }

  function designar(rol: 'captain' | 'delegate' | 'coach', confirmar?: string) {
    if (enviando) return;
    if (confirmar && !window.confirm(confirmar)) return;
    llamar(`${rol}:asignar`, '/api/equipos/cambiar-rol', {
      equipoId,
      perfilId,
      rol,
      accion: 'asignar',
    });
  }

  function quitarRol(rol: 'delegate' | 'coach') {
    if (enviando) return;
    llamar(`${rol}:quitar`, '/api/equipos/cambiar-rol', {
      equipoId,
      perfilId,
      rol,
      accion: 'quitar',
    });
  }

  function quitarDelPlantel() {
    if (enviando) return;
    if (!window.confirm(`¿Quitar a ${nombreVisible} del plantel?`)) return;
    llamar('fuera', '/api/equipos/quitar-integrante', { equipoId, perfilId });
  }

  async function dejarEquipo() {
    if (enviando) return;
    setEnviando('fuera');
    setError(null);

    try {
      const respuesta = await fetch('/api/equipos/quitar-integrante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, perfilId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo dejar el equipo.');
        setEnviando(null);
        return;
      }
      router.push(`/equipo/${equipoId}`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(null);
    }
  }

  const rolesFaltantes = ROLES_DESIGNABLES.filter((opcion) => !rolesEquipo.includes(opcion.rol));
  const puedeQuitarRapido = esUnoMismo ? !esCapitan : esCapitanViewer && !esCapitan;

  return (
    <div className={styles.filaIntegrante}>
      <div className={styles.filaIntegranteCabecera}>
        <Escudo src={fotoUrl} nombre={nombreVisible} tamano={40} />
        <div className={styles.filaIntegranteInfo}>
          <span className={styles.nombreIntegrante}>
            {nombreVisible}
            {esUnoMismo && ' (vos)'}
          </span>
          <div className={styles.filaBadgesRol}>
            {rolesEquipo.map((rol) => (
              <Badge key={rol} campo="integranteEquipo.rolEquipo" valor={rol} />
            ))}
          </div>
        </div>
        {puedeQuitarRapido && (
          <button
            type="button"
            className={styles.botonQuitarFila}
            title={esUnoMismo ? 'Dejar el equipo' : `Quitar a ${nombreVisible} del plantel`}
            onClick={esUnoMismo ? dejarEquipo : quitarDelPlantel}
            disabled={enviando !== null}
          >
            ×
          </button>
        )}
      </div>

      {error && <p className={styles.errorChico}>{error}</p>}

      {!esUnoMismo && esCapitanViewer && (
        <>
          <button
            type="button"
            className={styles.enlaceChico}
            onClick={() => setMasOpciones((valor) => !valor)}
          >
            {masOpciones ? 'Ocultar opciones' : 'Más opciones'}
          </button>
          {masOpciones && (
            <div className={styles.filaBotonesRol}>
              {rolesFaltantes.map((opcion) => (
                <button
                  key={opcion.rol}
                  type="button"
                  className={styles.botonSecundarioChico}
                  onClick={() => designar(opcion.rol, opcion.confirmar)}
                  disabled={enviando !== null}
                >
                  {enviando === `${opcion.rol}:asignar` ? 'Aplicando…' : opcion.etiqueta}
                </button>
              ))}
              {rolesEquipo
                .filter((rol) => rol === 'delegate' || rol === 'coach')
                .map((rol) => (
                  <button
                    key={rol}
                    type="button"
                    className={styles.botonSecundarioChico}
                    onClick={() => quitarRol(rol)}
                    disabled={enviando !== null}
                  >
                    Quitar como {rol === 'delegate' ? 'delegado' : 'DT'}
                  </button>
                ))}
              {esCapitan && (
                <button
                  type="button"
                  className={styles.botonPeligroChico}
                  onClick={quitarDelPlantel}
                  disabled={enviando !== null}
                >
                  {enviando === 'fuera' ? 'Quitando…' : 'Quitar del plantel'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
