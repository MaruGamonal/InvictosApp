import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import styles from '../../ingresar/pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Cambiar tu contraseña'),
};

/**
 * Paso intermedio del enlace de recuperación, y la razón por la que
 * existe: el enlace sirve **una sola vez**, y muchos proveedores de
 * correo lo abren por su cuenta para revisarlo antes de mostrártelo. Ese
 * escaneo lo gasta, y cuando la persona hace clic el enlace ya no vale —
 * "otp_expired" sobre un correo recién enviado.
 *
 * Los escáneres siguen enlaces (GET); no completan formularios (POST).
 * Así que abrir esto no consume nada: solo muestra un botón. El token se
 * canjea recién cuando alguien lo aprieta, que es algo que solo hace una
 * persona.
 *
 * El token viaja en la página y no se toca acá: quien lo usa es
 * `POST /api/restablecer-password/confirmar`.
 */
export default async function PaginaConfirmarRecuperacion({
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
            Puede que se haya cortado al copiarlo. Pedí uno nuevo desde la pantalla de ingreso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pagina}>
      <form className={styles.tarjeta} method="POST" action="/api/restablecer-password/confirmar">
        <h1 className={`fuente-display ${styles.titulo}`}>Cambiar tu contraseña</h1>
        <p className={styles.texto}>
          Tocá el botón para elegir una contraseña nueva. El enlace sirve una sola vez.
        </p>
        <input type="hidden" name="token_hash" value={token} />
        <input type="hidden" name="type" value={type ?? 'recovery'} />
        <button type="submit" className={styles.boton}>
          Continuar
        </button>
      </form>
    </div>
  );
}
