import type { Metadata } from 'next';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioIngreso } from './FormularioIngreso';
import styles from './pagina.module.css';

export const metadata: Metadata = {
  title: conNombreProducto('Ingresar'),
  description: 'Ingresá o creá tu cuenta.',
};

/**
 * UC-01 — la puerta de entrada que no existía: el backend (`iniciarRegistro`,
 * `POST /api/registro`, `auth/callback`) estaba completo desde T3, pero
 * ninguna pantalla lo llamaba. Un solo formulario para ingresar y para
 * registrarse (D-52: passwordless, alta mínima) — no hay "olvidé mi
 * contraseña" que ofrecer porque no hay contraseña.
 *
 * `modo` solo cambia el copy: viene de qué botón se tocó en la
 * bienvenida (`/`, "Ingresar" vs "Crear cuenta"), pero el formulario y
 * el envío son exactamente los mismos en los dos casos.
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
