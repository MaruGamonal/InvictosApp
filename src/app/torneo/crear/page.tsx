import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { listarCiudadesCacheado } from '@/app/torneos/_datos';
import { conNombreProducto } from '@/lib/nombreProducto';
import Link from 'next/link';
import { AvisoCuentaNoConfirmada } from '@/components/AvisoCuentaNoConfirmada';
import { estadoParaCrear } from '@/app/_puedeCrear';
import { FormularioCrearTorneo } from './FormularioCrearTorneo';
import styles from '../../ingresar/pagina.module.css';
import { CabeceraDeTarea } from '@/components/CabeceraDeTarea';

export const metadata: Metadata = { title: conNombreProducto('Crear torneo') };

/**
 * UC-16 — Crear torneo (Flujo 3 del paquete de diseño). Pide sesión
 * real, cuenta confirmada y una organización propia, y lo comprueba
 * **antes** de dibujar el formulario: reportado en vivo, completarlo
 * entero para enterarse al enviar de que la acción estaba bloqueada es
 * trabajo tirado.
 *
 * La organización ya no se crea sola (`asegurarOrganizacionPropia`): es
 * un paso explícito, y desde acá se manda a hacerlo.
 */
export default async function PaginaCrearTorneo() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const { cuentaConfirmada, tieneOrganizacion } = await estadoParaCrear(contexto);
  if (!cuentaConfirmada) {
    return (
      <main className={styles.pagina}>
        <CabeceraDeTarea volverA="/organizador/gestionar" titulo="Crear torneo" />
        <AvisoCuentaNoConfirmada mensaje="Confirmá tu cuenta para crear un torneo — revisá tu correo o pedí que te reenviemos el enlace." />
      </main>
    );
  }
  if (!tieneOrganizacion) {
    return (
      <main className={styles.pagina}>
        <CabeceraDeTarea
          volverA="/organizador/gestionar"
          titulo="Crear torneo"
          descripcion="Los torneos nacen bajo una organización. Creá la tuya y seguís acá."
        />
        {/* Justo debajo del texto: con el `margin-top: auto` de los
            formularios quedaba al pie, a una pantalla de distancia. Y al
            crear la organización se vuelve acá sola (`?siguiente`). */}
        <Link
          href="/organizador/gestionar/crear?siguiente=crear-torneo"
          className={`${styles.boton} ${styles.botonSeguido}`}
        >
          Crear mi organización
        </Link>
      </main>
    );
  }

  const provincias = await listarCiudadesCacheado();

  return (
    <main className={styles.pagina}>
      <FormularioCrearTorneo provincias={provincias} />
    </main>
  );
}
