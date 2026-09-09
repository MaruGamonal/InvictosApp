import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { obtenerMiPerfil } from '@/services/identidad/obtenerMiPerfil';
import { listarCiudadesCacheado } from '@/app/torneos/_datos';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioEditarPerfil } from './FormularioEditarPerfil';
import styles from '../../ingresar/pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Editar perfil') };

/** UC-02/UC-04 — Editar mi perfil deportivo y su visibilidad. Pide sesión real. */
export default async function PaginaEditarPerfil() {
  const contexto = await construirContexto();
  if (!contexto.usuarioId) redirect('/ingresar');

  const [perfil, provincias] = await Promise.all([
    obtenerMiPerfil(undefined, contexto),
    listarCiudadesCacheado(),
  ]);

  return (
    <div className={styles.pagina}>
      <FormularioEditarPerfil perfil={perfil} provincias={provincias} />
    </div>
  );
}
