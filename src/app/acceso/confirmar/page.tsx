import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import styles from '../../ingresar/pagina.module.css';

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
export default async function PaginaConfirmarAcceso({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash: token, type } = await searchParams;

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
        <h1 className={`fuente-display ${styles.titulo}`}>Confirmá que sos vos</h1>
        <p className={styles.texto}>Tocá el botón para entrar. El enlace sirve una sola vez.</p>
        <input type="hidden" name="token_hash" value={token} />
        <input type="hidden" name="type" value={type ?? 'magiclink'} />
        <button type="submit" className={styles.boton}>
          Continuar
        </button>
      </form>
    </div>
  );
}
