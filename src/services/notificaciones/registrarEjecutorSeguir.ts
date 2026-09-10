import { registrarAccionPendiente } from '@/lib/accionesPendientes';
import { seguir } from './seguir';

/**
 * Conecta la acción pendiente "seguir" (`accionesPendientes.ts`) con el
 * servicio real: alguien sin cuenta toca "Seguir" en una ficha pública,
 * `BotonSeguir` lo manda a `/ingresar` con el torneo/equipo codificado
 * en la URL, y si se registra ahí mismo, `completarRegistro` ejecuta
 * esto apenas la cuenta existe — sin que haga falta volver a tocar
 * "Seguir" (`06`, D-90-style: la intención ya estaba, no se vuelve a
 * pedir).
 *
 * Datos inválidos o incompletos no rompen el registro recién creado —
 * "seguir" es la acción de menor compromiso del producto (UC-42), no
 * vale la pena fallar una cuenta ya creada por esto.
 */
registrarAccionPendiente('seguir', async (datos, usuarioId) => {
  const { tipoSeguido, entidadId } = datos;
  if (
    (tipoSeguido !== 'tournament' && tipoSeguido !== 'team') ||
    typeof entidadId !== 'string'
  ) {
    return;
  }
  await seguir({ tipoSeguido, entidadId }, { usuarioId, permisos: {}, esSistema: false });
});
