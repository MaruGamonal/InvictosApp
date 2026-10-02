import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { construirContexto } from '@/lib/contexto';
import { conNombreProducto } from '@/lib/nombreProducto';
import { FormularioIngreso, type AccionPendienteDeLaUrl } from './FormularioIngreso';
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
 * `accion` dice qué estaba haciendo la persona cuando le pedimos la
 * cuenta (D-04b: la acción se ve sin sesión, la cuenta se pide recién al
 * usarla). Hay dos, y se resuelven distinto:
 *
 * - **`seguir`** (`tipoSeguido`, `entidadId`), desde `BotonSeguir`. Se
 *   puede ejecutar sola: terminar el ingreso o el registro ya deja a la
 *   persona siguiendo, con el ejecutor de `registrarEjecutorSeguir.ts`.
 * - **`inscribir`** (`torneoId`), desde `BotonInscribirEquipo`. Esta
 *   **no** se puede ejecutar sola, y por eso no tiene ejecutor: el
 *   redirect ocurre antes de elegir equipo, y quien se acaba de
 *   registrar ni siquiera tiene uno. Lo que se retoma es el lugar — se
 *   vuelve al torneo con el panel abierto.
 *
 * Quien ya tiene sesión iniciada no debería ver este formulario de nuevo —
 * va directo a `/inicio` (reportado en vivo: "siempre me manda al login").
 * Excepción: si llegó con una acción pendiente, que solo pasa sin sesión
 * (los dos botones mandan acá recién ante un 401).
 */
export default async function PaginaIngresar({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: string;
    accion?: string;
    tipoSeguido?: string;
    entidadId?: string;
    torneoId?: string;
  }>;
}) {
  const { modo, accion, tipoSeguido, entidadId, torneoId } = await searchParams;
  const esTipoSeguidoValido = tipoSeguido === 'tournament' || tipoSeguido === 'team';

  let accionPendiente: AccionPendienteDeLaUrl | null = null;
  if (accion === 'seguir' && esTipoSeguidoValido && entidadId) {
    accionPendiente = { tipo: 'seguir', tipoSeguido, entidadId };
  } else if (accion === 'inscribir' && torneoId) {
    accionPendiente = { tipo: 'inscribir', torneoId };
  }

  const contexto = await construirContexto();
  if (contexto.usuarioId && !accionPendiente) {
    redirect('/inicio');
  }

  return (
    <div className={styles.pagina}>
      <FormularioIngreso
        modoInicial={modo === 'crear' ? 'crear' : 'ingresar'}
        accionPendiente={accionPendiente}
      />
    </div>
  );
}
