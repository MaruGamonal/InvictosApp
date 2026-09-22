import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BotonCerrarSesion } from '@/components/BotonCerrarSesion';
import { MarcaInvicta } from '@/components/marca/MarcaInvicta';
import { CambiarDeModo } from '@/components/marca/CambiarDeModo';
import { obtenerContextoCacheado, obtenerOrganizacionActivaCacheada } from './_datos';
import { NavInferiorOrganizador } from './NavInferiorOrganizador';
import styles from './layout.module.css';

/**
 * Cabecera y bottom nav compartidos por el panel de Organizador
 * ("Ver como organizador" en Inicio): Home, Crear organización,
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
 *
 * Reportado en vivo — dos bugs reales de esta cabecera:
 * 1. "Volver a Inicio" enlazaba a `/inicio` liso, y `/inicio` redirige
 *    de nuevo para acá cuando la cuenta organiza pero no juega (ver el
 *    comentario en `app/inicio/page.tsx`) — un loop del que no se podía
 *    salir. El enlace ahora manda `?volver=1`, que `/inicio` respeta
 *    para no rebotar.
 * 2. No había ninguna forma de cerrar sesión desde acá — la única
 *    vivía en `/perfil` (Jugador), fuera del nav propio de Organizador.
 *    Se agrega `BotonCerrarSesion` (compartido con `/perfil`) acá mismo.
 */
export default async function LayoutOrganizadorGestionar({ children }: { children: ReactNode }) {
  const contexto = await obtenerContextoCacheado();
  if (!contexto.usuarioId) redirect('/ingresar');

  const organizacion = await obtenerOrganizacionActivaCacheada();

  return (
    <div className={styles.pagina}>
      <header className={styles.hero}>
        <MarcaInvicta
          conEnlaceIngresar={false}
          acciones={<BotonCerrarSesion variante="discreto" />}
        />
        <div className={styles.filaSuperior}>
          <span className={styles.etiquetaModo}>Modo Organizador</span>
          <CambiarDeModo modoActual="organizador" />
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
