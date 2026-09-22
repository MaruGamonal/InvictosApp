import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { listarCiudadesCacheado } from '@/app/torneos/_datos';
import { conNombreProducto } from '@/lib/nombreProducto';
import { AvisoCuentaNoConfirmada } from '@/components/AvisoCuentaNoConfirmada';
import { estadoParaCrear } from '@/app/_puedeCrear';
import { FormularioCrearEquipo } from './FormularioCrearEquipo';
import styles from '../../ingresar/pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Crear equipo') };

/** UC-10 — Crear equipo (`Invictos - D3 Equipos y Planteles.dc.html`). Pide sesión real. */
export default async function PaginaCrearEquipo() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  // Antes de cargar el formulario: completarlo entero para enterarse al
  // enviar de que la cuenta no está confirmada es trabajo tirado.
  const { cuentaConfirmada } = await estadoParaCrear(contexto);
  if (!cuentaConfirmada) {
    return (
      <div className={styles.pagina}>
        <h1 className={`fuente-display ${styles.titulo}`}>Crear equipo</h1>
        <AvisoCuentaNoConfirmada mensaje="Confirmá tu cuenta para crear un equipo — revisá tu correo o pedí que te reenviemos el enlace." />
      </div>
    );
  }

  const provincias = await listarCiudadesCacheado();

  return (
    <div className={styles.pagina}>
      <FormularioCrearEquipo provincias={provincias} />
    </div>
  );
}
