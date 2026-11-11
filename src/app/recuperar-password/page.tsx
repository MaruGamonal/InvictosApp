import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioRecuperacion } from './FormularioRecuperacion';
import styles from '../ingresar/pagina.module.css';
import { EnlaceVolver } from '@/components/EnlaceVolver';

export const metadata: Metadata = {
  title: conNombreProducto('Recuperar acceso'),
  description: 'Recuperá el acceso a tu cuenta.',
};

/** "¿Olvidaste tu contraseña?" — llega desde el link en `/ingresar`. */
export default function PaginaRecuperarPassword() {
  return (
    <main className={styles.pagina}>
      <EnlaceVolver alternativa="/ingresar" />
      <FormularioRecuperacion />
    </main>
  );
}
