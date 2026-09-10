import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { listarNotificaciones } from '@/services/notificaciones/listarNotificaciones';
import { NavInferior } from '@/components/NavInferior';
import { conNombreProducto } from '@/lib/nombreProducto';
import { ListaNotificaciones } from './ListaNotificaciones';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Notificaciones') };

/** UC-46 — Centro de notificaciones: solo el subconjunto accionable (`07`, D11). */
export default async function PaginaNotificaciones() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const { notificaciones, cursorSiguiente } = await listarNotificaciones({}, contexto);

  return (
    <div className={styles.pagina}>
      <h1 className={`fuente-display ${styles.titulo}`}>Notificaciones</h1>
      <ListaNotificaciones
        notificacionesIniciales={notificaciones}
        cursorInicial={cursorSiguiente}
      />
      <NavInferior activo="inicio" />
    </div>
  );
}
