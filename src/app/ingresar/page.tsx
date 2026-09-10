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
 *
 * `accion`/`tipoSeguido`/`entidadId` llegan cuando `BotonSeguir` manda acá
 * sin sesión (D-04b): "seguir" es la única acción pendiente hoy, con su
 * ejecutor en `registrarEjecutorSeguir.ts`. Con eso en la URL, terminar
 * el ingreso o el registro deja a la persona directamente siguiendo lo
 * que quería, sin volver a tocar "Seguir".
 */
export default async function PaginaIngresar({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; accion?: string; tipoSeguido?: string; entidadId?: string }>;
}) {
  const { modo, accion, tipoSeguido, entidadId } = await searchParams;
  const esTipoSeguidoValido = tipoSeguido === 'tournament' || tipoSeguido === 'team';
  const seguirPendiente =
    accion === 'seguir' && esTipoSeguidoValido && entidadId
      ? { tipoSeguido: tipoSeguido as 'tournament' | 'team', entidadId }
      : null;

  return (
    <div className={styles.pagina}>
      <FormularioIngreso
        modoInicial={modo === 'crear' ? 'crear' : 'ingresar'}
        seguirPendiente={seguirPendiente}
      />
    </div>
  );
}
