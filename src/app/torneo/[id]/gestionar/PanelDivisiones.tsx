'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/Badge';
import styles from './pagina.module.css';

export interface DivisionDelCertamenProps {
  id: string;
  division: string;
  estado: string;
}

export interface PanelDivisionesProps {
  torneoId: string;
  certamenId: string | null;
  division: string | null;
  divisionesDelCertamen: DivisionDelCertamenProps[];
}

/**
 * UC-16 (paso 5) — Abrir otra categoría competitiva del mismo evento
 * (`06`, D-103): la primera vez pide el nombre del certamen y la
 * etiqueta que le queda a este torneo, además de la nueva; con un
 * certamen ya armado, solo pide la etiqueta nueva. No pide "campos a
 * pisar" — la división nueva se crea idéntica a esta y se edita
 * después desde "Datos del torneo", si algo tiene que diferir.
 */
export function PanelDivisiones({
  torneoId,
  certamenId,
  division,
  divisionesDelCertamen,
}: PanelDivisionesProps) {
  const router = useRouter();
  const [nuevaDivision, setNuevaDivision] = useState('');
  const [nombreCertamen, setNombreCertamen] = useState('');
  const [divisionOrigen, setDivisionOrigen] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<{ id: string; division: string } | null>(null);

  async function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setCreada(null);

    try {
      const respuesta = await fetch('/api/torneos/agregar-division', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          torneoIdOrigen: torneoId,
          division: nuevaDivision,
          nombreCertamen: certamenId ? undefined : nombreCertamen,
          divisionOrigen: certamenId ? undefined : divisionOrigen,
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo agregar la división. Probá de nuevo.');
        setEnviando(false);
        return;
      }
      setCreada({ id: cuerpo.data.id, division: cuerpo.data.division });
      setNuevaDivision('');
      setNombreCertamen('');
      setDivisionOrigen('');
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={styles.lista}>
      {certamenId ? (
        <p className={styles.avisoChico}>
          Este torneo es la división <strong>{division}</strong> de su certamen.
        </p>
      ) : (
        <p className={styles.avisoChico}>
          Todavía es un torneo suelto. Agregar una división lo agrupa con la nueva bajo un mismo
          evento — cada una queda como un torneo completo e independiente.
        </p>
      )}

      {divisionesDelCertamen.length > 0 && (
        <div className={styles.lista}>
          {divisionesDelCertamen.map((d) => (
            <Link
              key={d.id}
              href={`/torneo/${d.id}/gestionar/resumen`}
              className={styles.filaIntegranteCabecera}
            >
              <div className={styles.filaIntegranteInfo}>
                <span className={styles.nombreIntegrante}>División {d.division}</span>
                <Badge campo="torneo.estado" valor={d.estado} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {error && <p className={styles.errorChico}>{error}</p>}
      {creada && (
        <p className={styles.avisoChico}>
          División {creada.division} creada, en borrador.{' '}
          <Link href={`/torneo/${creada.id}/gestionar/configuracion`}>Configurarla →</Link>
        </p>
      )}

      <form className={styles.formularioChico} onSubmit={agregar}>
        {!certamenId && (
          <>
            <label>
              Nombre del evento
              <input
                type="text"
                required
                placeholder="Apertura 2026"
                value={nombreCertamen}
                onChange={(evento) => setNombreCertamen(evento.target.value)}
              />
            </label>
            <label>
              Etiqueta de este torneo
              <input
                type="text"
                required
                placeholder="A"
                value={divisionOrigen}
                onChange={(evento) => setDivisionOrigen(evento.target.value)}
              />
            </label>
          </>
        )}
        <label>
          Etiqueta de la división nueva
          <input
            type="text"
            required
            placeholder="B"
            value={nuevaDivision}
            onChange={(evento) => setNuevaDivision(evento.target.value)}
          />
        </label>
        <button type="submit" disabled={enviando}>
          {enviando ? 'Agregando…' : 'Agregar división'}
        </button>
      </form>
    </div>
  );
}
