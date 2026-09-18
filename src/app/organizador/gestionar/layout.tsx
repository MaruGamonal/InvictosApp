import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { obtenerContextoCacheado, obtenerOrganizacionActivaCacheada } from './_datos';
import { NavInferiorOrganizador } from './NavInferiorOrganizador';
import styles from './layout.module.css';

/**
 * Cabecera y bottom nav compartidos por el panel de Organizador
 * ("Ver como administrador" en Inicio): Home, Crear organización,
 * Equipo de trabajo, Invitar Administrador y Perfil público —
 * "Transferir" queda deliberadamente afuera de esta tanda.
 *
 * A diferencia de `torneo/[id]/gestionar` (que exige un torneo y una
 * organización ya existentes), acá quien todavía no tiene ninguna
 * organización propia ni fue invitada a una ajena puede seguir
 * navegando: el título muestra "Organizador" a secas y cada página que
 * sí necesita una organización (Home, Equipo de trabajo, Invitar
 * Administrador, Perfil público) redirige a Crear organización por su
 * cuenta.
 */
export default async function LayoutOrganizadorGestionar({ children }: { children: ReactNode }) {
  const contexto = await obtenerContextoCacheado();
  if (!contexto.usuarioId) redirect('/ingresar');

  const organizacion = await obtenerOrganizacionActivaCacheada();

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <div className={styles.filaSuperior}>
          <Link href="/inicio" className={styles.enlaceVolver} aria-label="Volver a Inicio">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 5-7 7 7 7" />
            </svg>
          </Link>
          <span className={styles.etiquetaModo}>Modo Organizador</span>
        </div>
        <h1 className={`fuente-display ${styles.titulo}`}>
          {organizacion?.nombre ?? 'Organizador'}
        </h1>
      </header>

      <main className={styles.contenido}>{children}</main>

      <NavInferiorOrganizador />
    </div>
  );
}
