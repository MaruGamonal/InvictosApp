import { obtenerClienteAdmin } from '@/lib/supabase/admin';

const URL_DEL_SITIO = () => process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Manda el enlace que confirma la cuenta — mismo mecanismo que
 * `solicitarVerificacionBasica` (T3): un magic link de Supabase con
 * `shouldCreateUser: false`, distinguido por `data.accion` en vez de un
 * sistema de tokens propio. Deliberadamente no toca `email_confirm` de
 * Supabase Auth (eso ya quedó `true` al crear la cuenta, `06`, D-90,
 * para no arriesgar que el propio Supabase bloquee el inicio de
 * sesión): la confirmación que exige `verificarCuentaConfirmada` es
 * enteramente nuestra, en `usuario.email_confirmado`.
 *
 * Vive en `lib` (y no en `services/identidad`, donde nació) porque
 * `verificarCuentaConfirmada` —el propio gate, `lib/cuentaConfirmada.ts`—
 * necesita mandarlo al bloquear una acción, y `lib` no puede importar de
 * `services` (`boundaries/dependencies`). Lo siguen llamando
 * `registrar.ts` (al crear la cuenta) y `reenviarConfirmacion.ts` (el
 * botón "Reenviar enlace") además del propio gate — no es un `Servicio`
 * porque no valida nada por su cuenta: el rate-limit y el permiso de
 * quién puede pedirlo viven en cada llamador.
 */
export async function enviarEmailConfirmacion(email: string): Promise<void> {
  const supabase = obtenerClienteAdmin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      // La intención va en la URL de vuelta, no en `data`:
      // `signInWithOtp` solo aplica `data` cuando **crea** la cuenta, y
      // acá va con `shouldCreateUser: false` sobre una que ya existe, así
      // que nunca llegaba. La cuenta quedaba sin confirmar después de que
      // la persona confirmara.
      emailRedirectTo: `${URL_DEL_SITIO()}/acceso/confirmar`,
    },
  });
  if (error) throw error;
}
