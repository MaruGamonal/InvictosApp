import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { listarNotificaciones } from '@/services/notificaciones/listarNotificaciones';
import { NavInferior } from '@/components/NavInferior';
import { NavInferiorOrganizador } from '@/app/organizador/gestionar/NavInferiorOrganizador';
import { MarcaInvicta } from '@/components/marca/MarcaInvicta';
import { conNombreProducto } from '@/lib/nombreProducto';
import { ListaNotificaciones } from './ListaNotificaciones';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Notificaciones') };

/**
 * UC-46 — Centro de notificaciones: solo el subconjunto accionable
 * (`07`, D11).
 *
 * El modo viaja en la URL (`?modo=organizador`, que pone la campanita
 * del panel). Sin eso, esta pantalla montaba siempre el nav de Jugador
 * y tocar un aviso llevaba a la ficha pública del torneo: quien estaba
 * gestionando una organización terminaba en el otro modo sin haberlo
 * pedido, y tenía que rehacer el camino.
 *
 * El modo no otorga nada — solo elige nav y destino—, así que un valor
 * raro en la URL cae en "jugador" en vez de fallar.
 */
export default async function PaginaNotificaciones({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const { modo: modoPedido } = await searchParams;
  const modo = modoPedido === 'organizador' ? 'organizador' : 'jugador';

  const { notificaciones, cursorSiguiente } = await listarNotificaciones({}, contexto);

  return (
    <div className={styles.pagina}>
      <MarcaInvicta conEnlaceIngresar={false} conCampana={false} />
      <div className={styles.filaTitulo}>
        <h1 className={`fuente-display ${styles.titulo}`}>Notificaciones</h1>
        <Link
          href={
            modo === 'organizador'
              ? '/notificaciones/preferencias?modo=organizador'
              : '/notificaciones/preferencias'
          }
          className={styles.enlacePreferencias}
          aria-label="Preferencias de notificación"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </Link>
      </div>
      <ListaNotificaciones
        notificacionesIniciales={notificaciones}
        cursorInicial={cursorSiguiente}
        modo={modo}
      />
      {modo === 'organizador' ? (
        <NavInferiorOrganizador />
      ) : (
        <NavInferior activo="inicio" autenticado />
      )}
    </div>
  );
}
