import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { obtenerMiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { NavInferior } from '@/components/NavInferior';
import { MarcaInvicta } from '@/components/marca/MarcaInvicta';
import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import { BotonCerrarSesion } from '@/components/BotonCerrarSesion';
import { conNombreProducto } from '@/lib/nombreProducto';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Mi perfil') };

/** UC-02 — Mi perfil. La edición vive en `/perfil/editar`. */
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
      <header className={styles.hero}>
        <MarcaInvicta conEnlaceIngresar={false} />
        <h1 className={`fuente-display ${styles.tituloHero}`}>Perfil</h1>
      </header>

      <div className={styles.contenido}>
        <div className={styles.encabezado}>
          <span className={styles.avatarAnillo}>
            <Escudo src={perfil.fotoUrl} nombre={perfil.nombreVisible} tamano={72} />
          </span>
          <h2 className={`fuente-display ${styles.nombre}`}>{perfil.nombreVisible}</h2>
          {user?.email && <p className={styles.email}>{user.email}</p>}
          <Badge campo="perfilDeportivo.visibilidad" valor={perfil.visibilidad} conPunto />
        </div>

        <span className={styles.tituloSeccion}>Tu cuenta</span>
        <dl className={styles.tarjetaDatos}>
          <div className={styles.dato}>
            <svg
              className={styles.iconoDato}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <dt className={styles.etiquetaDato}>Posición</dt>
            <dd className={styles.valorDato}>
              {perfil.posicion
                ? obtenerEtiqueta('perfilDeportivo.posicion', perfil.posicion).etiqueta
                : 'Sin especificar'}
            </dd>
          </div>
          <div className={styles.dato}>
            <svg
              className={styles.iconoDato}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
            <dt className={styles.etiquetaDato}>Visibilidad del perfil</dt>
            <dd className={styles.valorDato}>
              {obtenerEtiqueta('perfilDeportivo.visibilidad', perfil.visibilidad).etiqueta}
            </dd>
          </div>
        </dl>

        <Link href="/perfil/editar" className={styles.enlaceEditar}>
          Editar perfil
        </Link>

        <BotonCerrarSesion />
      </div>

      <NavInferior activo="perfil" autenticado />
    </div>
  );
}
