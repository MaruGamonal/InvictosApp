/**
 * Si quien mira tiene sesión, preguntado una sola vez y recordado entre
 * pantallas.
 *
 * **Por qué existe.** Las pantallas de descubrimiento se cachean con
 * `CONTEXTO_PUBLICO` (`06`, D-90): el servidor arma la misma respuesta
 * para cualquiera, así que no puede decir si hay sesión. Los tres
 * componentes que sí lo necesitan —el nav inferior, la campanita y el
 * enlace de ingreso— lo preguntaban cada uno por su cuenta con
 * `GET /api/mi-usuario`, en cada montaje.
 *
 * Eso son hasta tres pedidos idénticos por pantalla, y **otros tres al
 * cambiar de pantalla**, porque los componentes se vuelven a montar. El
 * nav no dibuja nada hasta que el suyo contesta, así que aparecía tarde
 * cada vez: reportado en vivo como "en el modo jugador el menú tiene un
 * delay en cada pantalla". En el modo organizador no pasa porque su
 * layout exige sesión en el servidor y el nav se dibuja con la página.
 *
 * Acá se arregla en dos pasos:
 *
 * 1. **Un pedido por carga, compartido.** La promesa vive en el módulo,
 *    así que los tres componentes esperan la misma.
 * 2. **La respuesta se recuerda** en `sessionStorage`, así que al
 *    cambiar de pantalla el nav se dibuja **en el primer render**, sin
 *    esperar nada, y la comprobación real corre por detrás y corrige si
 *    hiciera falta.
 *
 * **Esto no autoriza nada.** Es una preferencia de dibujo: decide si se
 * muestra un nav, no si se puede hacer algo. Cada servicio resuelve la
 * sesión en el servidor por su cuenta (`10`, 2.1), así que escribir a
 * mano el valor recordado no da acceso a nada — como mucho, se ve un
 * menú cuyos enlaces van a rebotar a "Ingresar".
 */

const CLAVE_RECORDADA = 'sesion_activa';

/**
 * `sessionStorage` puede no existir o lanzar —ventana privada, datos de
 * sitio bloqueados—, así que nunca se lo toca sin red.
 */
function leerRecordada(): boolean | null {
  try {
    const guardado = sessionStorage.getItem(CLAVE_RECORDADA);
    if (guardado === '1') return true;
    if (guardado === '0') return false;
    return null;
  } catch {
    return null;
  }
}

function recordar(autenticado: boolean): void {
  try {
    sessionStorage.setItem(CLAVE_RECORDADA, autenticado ? '1' : '0');
  } catch {
    // Sin almacenamiento la aplicación anda igual: solo vuelve a
    // preguntar en cada carga, que es como estaba antes.
  }
}

/** La promesa en curso, para que tres componentes no pidan tres veces. */
let enCurso: Promise<boolean> | undefined;

export function consultarSesion(): Promise<boolean> {
  enCurso ??= fetch('/api/mi-usuario')
    .then((respuesta) => {
      recordar(respuesta.ok);
      return respuesta.ok;
    })
    .catch(() => {
      // Sin conexión no se recuerda nada: un corte de red no es una
      // respuesta sobre la sesión, y guardarlo como "no hay" haría
      // desaparecer el nav hasta cerrar la pestaña.
      return false;
    });
  return enCurso;
}

/** Para los tests: nada de estado compartido entre casos. */
export function olvidarSesionConsultada(): void {
  enCurso = undefined;
  try {
    sessionStorage.removeItem(CLAVE_RECORDADA);
  } catch {
    // Igual que arriba: sin almacenamiento no hay nada que limpiar.
  }
}

export { leerRecordada };
