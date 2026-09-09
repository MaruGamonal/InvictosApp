import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerMiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { NavInferior } from '@/components/NavInferior';
import { conNombreProducto } from '@/lib/nombreProducto';
import { BotonCerrarSesion } from './BotonCerrarSesion';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Mi perfil') };

/**
 * UC-02 — Mi perfil, en modo lectura. La edición (nombre, posición,
 * visibilidad) todavía no tiene formulario propio — igual que "Cargar
 * resultados" en Inicio, es gestión que ya tiene servicio de backend
 * (`actualizarMiPerfil`) pero ninguna pantalla todavía.
 */
export default async function PaginaPerfil() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const [perfil, supabase] = await Promise.all([
    obtenerMiPerfil(undefined, contexto),
    crearClienteServidor(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className={styles.pagina}>
      <div className={styles.encabezado}>
        <div className={styles.avatar} aria-hidden>
          {perfil.nombreVisible.trim().charAt(0).toUpperCase() || '?'}
        </div>
        <h1 className={`fuente-display ${styles.nombre}`}>{perfil.nombreVisible}</h1>
        {user?.email && <p className={styles.email}>{user.email}</p>}
      </div>

      <dl className={styles.datos}>
        <div className={styles.dato}>
          <dt>Posición</dt>
          <dd>
            {perfil.posicion
              ? obtenerEtiqueta('perfilDeportivo.posicion', perfil.posicion).etiqueta
              : 'Sin especificar'}
          </dd>
        </div>
        <div className={styles.dato}>
          <dt>Visibilidad del perfil</dt>
          <dd>{obtenerEtiqueta('perfilDeportivo.visibilidad', perfil.visibilidad).etiqueta}</dd>
        </div>
      </dl>

      <BotonCerrarSesion />

      <NavInferior activo="perfil" />
    </div>
  );
}
