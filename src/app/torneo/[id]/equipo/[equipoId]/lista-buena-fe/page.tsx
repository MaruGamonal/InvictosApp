import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerListaDeBuenaFe } from '@/services/inscripciones/obtenerListaDeBuenaFe';
import { esErrorDeAplicacion } from '@/lib/errores';
import { conNombreProducto } from '@/lib/nombreProducto';
import { PanelListaDeBuenaFe } from './PanelListaDeBuenaFe';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Lista de buena fe') };

/**
 * UC-27 — Quién está habilitado a jugar este torneo puntual, distinto
 * del plantel permanente del equipo (T19). Solo para Capitán o
 * Delegado del equipo inscripto (`verificarPermisoEquipo`,
 * `inscribir_a_torneo`).
 */
export default async function PaginaListaDeBuenaFe({
  params,
}: {
  params: Promise<{ id: string; equipoId: string }>;
}) {
  const { id, equipoId } = await params;
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  let lista;
  try {
    lista = await obtenerListaDeBuenaFe({ torneoId: id, equipoId }, contexto);
  } catch (error) {
    if (
      esErrorDeAplicacion(error) &&
      (error.codigo === 'SIN_PERMISO' || error.codigo === 'NO_ENCONTRADO')
    ) {
      redirect(`/torneo/${id}`);
    }
    throw error;
  }

  return (
    <div className={styles.pagina}>
      <Link href={`/torneo/${id}`} className={styles.enlaceVolver}>
        ← Volver
      </Link>
      <h1 className={`fuente-display ${styles.titulo}`}>Lista de buena fe</h1>
      <p className={styles.texto}>
        Quién está habilitado para {lista.torneoNombre} — distinto del plantel permanente.
      </p>

      <PanelListaDeBuenaFe
        torneoId={id}
        equipoId={equipoId}
        integrantes={lista.integrantes}
        minJugadores={lista.minJugadores}
        maxJugadores={lista.maxJugadores}
        cerrada={lista.cerrada}
      />

      <p className={styles.textoAyuda}>
        El DT no ocupa cupo de jugadores. La lista sigue abierta durante todo el torneo salvo que el
        organizador la cierre.
      </p>
    </div>
  );
}
