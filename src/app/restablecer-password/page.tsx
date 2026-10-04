import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioNuevaPassword } from './FormularioNuevaPassword';
import styles from '../ingresar/pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Elegir contraseña nueva'),
};

/**
 * Adonde lleva `/restablecer-password/confirmar` una vez que su `POST`
 * verificó el token del correo y dejó puesta la sesión de recuperación.
 * Sin esa sesión, `POST /api/restablecer-password` rechaza con
 * `NO_AUTENTICADO`.
 */
export default function PaginaRestablecerPassword() {
  return (
    <div className={styles.pagina}>
      <FormularioNuevaPassword />
    </div>
  );
}
