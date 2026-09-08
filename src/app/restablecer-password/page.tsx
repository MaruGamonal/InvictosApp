import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioNuevaPassword } from './FormularioNuevaPassword';
import styles from '../ingresar/pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Elegir contraseña nueva'),
};

/**
 * Destino del enlace de recuperación, después de que `auth/callback`
 * canjea el código por una sesión (`?next=/restablecer-password`, que
 * arma `solicitarRecuperacionPassword`). Sin esa sesión de recuperación
 * puesta, `POST /api/restablecer-password` rechaza con `NO_AUTENTICADO`.
 */
export default function PaginaRestablecerPassword() {
  return (
    <div className={styles.pagina}>
      <FormularioNuevaPassword />
    </div>
  );
}
