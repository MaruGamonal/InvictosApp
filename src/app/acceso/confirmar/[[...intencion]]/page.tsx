import type { Metadata } from 'next';
import { obtenerPool } from '@/db/cliente';
import { esIdentificador } from '@/lib/validacion';
import { conNombreProducto } from '@/lib/nombreProducto';
import styles from '../../../ingresar/pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Confirmar el enlace'),
};

/**
 * Paso intermedio de los enlaces de acceso que mandamos por correo
 * (confirmar la cuenta, verificar la organización). No canjea nada:
 * muestra un botón.
 *
 * Existe por las dos razones que hacían fallar estos enlaces. Una: el
 * enlace sirve una sola vez y muchos proveedores de correo lo abren por
 * su cuenta para revisarlo, gastándolo antes de que la persona haga
 * clic. Los escáneres siguen enlaces (GET) pero no completan
 * formularios (POST), así que abrir esto no consume nada. La otra: el
 * canje por código necesita una cookie que el navegador guardó al pedir
 * el enlace, y estos enlaces los emite el cliente admin, que no escribe
 * cookies — esa cookie no existía nunca.
 */
/**
 * Cuando el enlace trae una organización en la ruta, la pantalla la
 * **nombra**: "Confirmá que sos vos" a secas no dice para qué se está
 * entrando, y con este mismo enlace se confirma una cuenta o se
 * verifica una organización.
 *
 * Si el id no llegó —porque la plantilla del correo no reenvía la URL
 * de vuelta entera—, la verificación igual se resuelve del lado del
 * servidor (`confirmarVerificacionesPendientes`). Lo único que se
 * pierde acá es poder nombrarla.
 *
 * El nombre es solo para mostrarlo: nada de esto decide ningún permiso.
 */
async function nombreDeLaOrganizacion(segmentos: string[] | undefined): Promise<string | null> {
  if (!segmentos || segmentos[0] !== 'organizacion') return null;
  const id = segmentos[1];
  if (!id || !esIdentificador(id)) return null;
  try {
    const { rows } = await obtenerPool().query<{ nombre: string }>(
      'SELECT nombre FROM organizacion WHERE id = $1',
      [id],
    );
    return rows[0]?.nombre ?? null;
  } catch {
    // Si la base no contesta, la pantalla sigue sirviendo para entrar:
    // no vale la pena romperla por no poder decir un nombre.
    return null;
  }
}

export default async function PaginaConfirmarAcceso({
  params,
  searchParams,
}: {
  params: Promise<{ intencion?: string[] }>;
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash: token, type } = await searchParams;
  const { intencion } = await params;
  const nombreOrganizacion = await nombreDeLaOrganizacion(intencion);

  if (!token) {
    return (
      <div className={styles.pagina}>
        <div className={styles.tarjeta}>
          <h1 className={`fuente-display ${styles.titulo}`}>El enlace está incompleto</h1>
          <p className={styles.texto}>
            Puede que se haya cortado al copiarlo. Pedí uno nuevo y volvé a intentar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <form className={styles.tarjeta} method="POST" action="/api/acceso/confirmar">
        <h1 className={`fuente-display ${styles.titulo}`}>
          {nombreOrganizacion ? 'Verificá tu organización' : 'Confirmá que sos vos'}
        </h1>
        <p className={styles.texto}>
          {nombreOrganizacion
            ? `Tocá el botón para verificar ${nombreOrganizacion}. El enlace sirve una sola vez.`
            : 'Tocá el botón para entrar. El enlace sirve una sola vez.'}
        </p>
        <input type="hidden" name="token_hash" value={token} />
        <input type="hidden" name="type" value={type ?? 'magiclink'} />
        {/* La ruta dice para qué se mandó el enlace; el POST la necesita. */}
        <input type="hidden" name="intencion" value={(intencion ?? []).join('/')} />
        <button type="submit" className={styles.boton}>
          {nombreOrganizacion ? 'Verificar organización' : 'Continuar'}
        </button>
      </form>
    </div>
  );
}
