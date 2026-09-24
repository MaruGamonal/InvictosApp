import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CabeceraDeModo } from '@/components/marca/CabeceraDeModo';
import {
  obtenerContextoCacheado,
  obtenerMisOrganizacionesCacheadas,
  obtenerNombreDeQuienMiraCacheado,
  obtenerOrganizacionActivaCacheada,
} from './_datos';
import { SelectorOrganizacionActiva } from './SelectorOrganizacionActiva';
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
 *    Vive ahora en el Perfil de cada modo, que es donde se la busca y
 *    donde está en los dos por igual.
 *
 * La cabecera es `CabeceraDeModo`, la misma que Inicio: lo único que
 * cambia entre los dos modos es el título —el equipo o la
 * organización—, pedido en vivo.
 */
export default async function LayoutOrganizadorGestionar({ children }: { children: ReactNode }) {
  const contexto = await obtenerContextoCacheado();
  if (!contexto.usuarioId) redirect('/ingresar');

  const [organizacion, nombreUsuario, organizaciones] = await Promise.all([
    obtenerOrganizacionActivaCacheada(),
    obtenerNombreDeQuienMiraCacheado(),
    obtenerMisOrganizacionesCacheadas(),
  ]);
  const activa = organizaciones.find((o) => o.organizacionId === organizacion?.organizacionId);

  return (
    <div className={styles.pagina}>
      {/* El título dice el modo; la organización activa va **al lado**,
          como selector. Antes el nombre ocupaba el título y no se
          distinguía de un rótulo; debajo, sumaba un tercer renglón. */}
      <CabeceraDeModo
        modo="organizador"
        nombreUsuario={nombreUsuario}
        titulo="Organizador"
        puedeCambiarDeModo
        alCostadoDelTitulo={
          organizacion ? (
            <SelectorOrganizacionActiva
              organizaciones={organizaciones}
              activaId={organizacion.organizacionId}
              nombreActiva={organizacion.nombre}
              logoActiva={activa?.logoUrl ?? null}
            />
          ) : null
        }
      />

      <main className={styles.contenido}>{children}</main>

      <NavInferiorOrganizador />
    </div>
  );
}
