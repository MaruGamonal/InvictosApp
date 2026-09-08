import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioIngreso } from './FormularioIngreso';
import styles from './pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Ingresar'),
  description: 'Ingresá o creá tu cuenta.',
};

/**
 * UC-01 — con contraseña: ingresar (`POST /api/ingresar`) y crear
 * cuenta (`POST /api/registro`) son dos operaciones distintas que
 * comparten esta misma pantalla — `modo` decide cuál mostrar y a cuál
 * ruta mandar el formulario. Viene de qué botón se tocó en la
 * bienvenida (`/`, "Ingresar" vs "Crear cuenta").
 */
export default async function PaginaIngresar({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const { modo } = await searchParams;
  return (
    <div className={styles.pagina}>
      <FormularioIngreso modoInicial={modo === 'crear' ? 'crear' : 'ingresar'} />
    </div>
  );
}
