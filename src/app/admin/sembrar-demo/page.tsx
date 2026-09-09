import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioSembrarDemo } from './FormularioSembrarDemo';
import styles from '../../ingresar/pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Sembrar datos de demo') };

/**
 * Utilidad de admin, sin link desde ningún lado del producto — se
 * accede solo conociendo la URL. Protegida por el mismo `CRON_SECRET`
 * que ya exige `POST /api/admin/sembrar-demo` del lado del servidor;
 * esta pantalla no agrega ninguna autorización nueva, solo evita tener
 * que armar el pedido a mano con curl o Postman.
 */
export default function PaginaSembrarDemo() {
  return (
    <div className={styles.pagina}>
      <FormularioSembrarDemo />
    </div>
  );
}
