import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { listarCiudadesCacheado } from '@/app/torneos/_datos';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioCrearEquipo } from './FormularioCrearEquipo';
import styles from '../../ingresar/pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Crear equipo') };

/** UC-10 — Crear equipo (`Invictos - D3 Equipos y Planteles.dc.html`). Pide sesión real. */
export default async function PaginaCrearEquipo() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const provincias = await listarCiudadesCacheado();

  return (
    <div className={styles.pagina}>
      <FormularioCrearEquipo provincias={provincias} />
    </div>
  );
}
