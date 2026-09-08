import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioRecuperacion } from './FormularioRecuperacion';
import styles from '../ingresar/pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Recuperar acceso'),
  description: 'Recuperá el acceso a tu cuenta.',
};

/** "¿Olvidaste tu contraseña?" — llega desde el link en `/ingresar`. */
export default function PaginaRecuperarPassword() {
  return (
    <div className={styles.pagina}>
      <FormularioRecuperacion />
    </div>
  );
}
