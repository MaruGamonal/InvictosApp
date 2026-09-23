import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/Badge';
import { BotonCerrarSesion } from '@/components/BotonCerrarSesion';
import { EstadoVacio } from '@/components/EstadoVacio';
import { BotonVerificarOrganizacion } from '@/components/BotonVerificarOrganizacion';
import { conNombreProducto } from '@/lib/nombreProducto';
import { obtenerPerfilOrganizador } from '@/services/organizadores/obtenerPerfilOrganizador';
import { obtenerContextoCacheado, obtenerOrganizacionActivaCacheada } from '../_datos';
import { SubidaLogoOrganizacion } from './SubidaLogoOrganizacion';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Perfil público') };

/**
 * UC-08 — Vista del propio perfil público desde el panel de
 * Organizador: mismos datos que `/organizador/[id]` (visible para
 * cualquiera), con el agregado de poder subir el logo desde acá.
 *
 * Cerrar sesión vive acá y no en la cabecera: es donde está en modo
 * Jugador (`/perfil`) y donde se la busca. Pedido en vivo que esté en
 * los dos modos; estarlo en el mismo lugar es lo que la hace
 * encontrable sin pensar en qué modo se está.
 */
export default async function PaginaPerfilPublicoOrganizador() {
  const organizacion = await obtenerOrganizacionActivaCacheada();
  if (!organizacion) redirect('/organizador/gestionar');

  const contexto = await obtenerContextoCacheado();
  const perfil = await obtenerPerfilOrganizador(
    { organizacionId: organizacion.organizacionId },
    contexto,
  );

  return (
    <div className={styles.contenidoPagina}>
      <SubidaLogoOrganizacion
        organizacionId={perfil.id}
        nombre={perfil.nombre}
        logoUrl={perfil.logoUrl}
      />

      <div className={styles.filaNombre}>
        <h1 className={`fuente-display ${styles.nombre}`}>{perfil.nombre}</h1>
        <Badge campo="organizacion.nivelVerificacion" valor={perfil.nivelVerificacion} />
      </div>

      <Link href={`/organizador/${perfil.id}`} className={styles.enlacePublico}>
        Ver como lo ve el público →
      </Link>

      {perfil.descripcion && <p className={styles.descripcion}>{perfil.descripcion}</p>}

      {/* La explicación larga de la verificación vive acá, en el detalle
          de la organización, y no en la lista del panel: ahí ocupaba
          espacio en cada tarjeta para decir siempre lo mismo. */}
      {perfil.nivelVerificacion === 'unverified' && (
        <section className={styles.verificacion}>
          <h2 className={styles.verificacionTitulo}>
            <span aria-hidden>⚠</span> Organización pendiente de verificación
          </h2>
          <p className={styles.verificacionTexto}>
            Verificar es confirmar la dirección de correo con la que entrás: no pedimos
            documentación ni validamos nada legal. Te mandamos un enlace y con tocarlo alcanza.
          </p>
          <p className={styles.verificacionTexto}>
            Mientras no lo hagas, tus torneos funcionan completos y se comparten por link, pero no
            aparecen en las búsquedas, y podés tener uno solo publicado a la vez.
          </p>
          <BotonVerificarOrganizacion
            organizacionId={perfil.id}
            soyTitular={organizacion.rol === 'owner'}
            etiqueta="Verificar organización"
          />
        </section>
      )}

      <div className={styles.gridStats}>
        <div className={styles.stat}>
          <span className={`${styles.statValor} fuente-display`}>{perfil.trayectoria.length}</span>
          <span className={styles.statEtiqueta}>Organizados</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statValor} fuente-display`}>
            {perfil.trayectoria.filter((t) => t.estado === 'finished').length}
          </span>
          <span className={styles.statEtiqueta}>Finalizados</span>
        </div>
      </div>

      <section>
        <h2 className={styles.tituloSeccion}>Trayectoria</h2>
        {perfil.trayectoria.length === 0 ? (
          <EstadoVacio mensaje="Todavía no tiene torneos publicados." />
        ) : (
          <div className={styles.lista}>
            {perfil.trayectoria.map((torneo) => (
              <Link key={torneo.id} href={`/torneo/${torneo.id}`} className={styles.filaTorneo}>
                <span className={styles.nombreTorneo}>{torneo.nombre}</span>
                <div className={styles.badgesTorneo}>
                  <Badge campo="torneo.modalidad" valor={torneo.modalidad} />
                  <Badge campo="torneo.estado" valor={torneo.estado} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <BotonCerrarSesion />
    </div>
  );
}
