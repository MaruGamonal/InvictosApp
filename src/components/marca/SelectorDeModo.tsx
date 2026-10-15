import Link from 'next/link';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import { HojaDeOpciones } from '@/components/HojaDeOpciones';
import { claseDeOpcion, CuerpoDeOpcion } from '@/components/_opcionesDeHoja';

export interface SelectorDeModoProps {
  /** En qué modo está parada la pantalla que lo muestra. */
  modoActual: 'jugador' | 'organizador';
}

/**
 * El cambio entre los dos modos, como hoja de selección.
 *
 * Venía de un enlace —"Ir al modo organizador"— que nombraba el modo
 * **al que vas**. El resultado era que la aplicación nunca decía en
 * qué modo estabas: la palabra "Organizador" había salido del título
 * (y bien: un rótulo grande que repite dónde estoy ocupa el lugar de
 * lo único que esa fila tiene para decir) y las dos bottom nav dicen
 * exactamente lo mismo, Inicio · Equipo · Torneos · Perfil. Te
 * enterabas de dónde estabas leyendo el cartel de salida.
 *
 * Ahora es un chip al lado de la campana que dice **dónde estás**
 * —"Jugador"— y que al tocarse abre la hoja con los dos lados y lo que
 * hay en cada uno. El actual queda marcado y desactivado.
 *
 * Chip y no control de barra: cambiar de modo es poco frecuente, y un
 * control a todo el ancho en la cabecera le daba el peso de una acción
 * principal. La fila de 44px queda para la organización, que sí es la
 * que se cambia seguido. El chip se lee como rótulo —dice el modo— y
 * resulta que además se toca.
 *
 * `/inicio?volver=1` y no `/inicio` liso: `/inicio` rebota de nuevo al
 * panel cuando la cuenta organiza pero no juega, y sin el parámetro
 * volver era un loop.
 */
export function SelectorDeModo({ modoActual }: SelectorDeModoProps) {
  const esJugador = modoActual === 'jugador';

  return (
    <HojaDeOpciones
      etiqueta={esJugador ? 'Jugador' : 'Organizador'}
      aspecto="chip"
      descripcionDelControl="Modo"
      titulo={`Elegí cómo usar ${NOMBRE_PRODUCTO}`}
      bajada="Podés cambiar cuando quieras."
    >
      <Opcion
        href="/inicio?volver=1"
        titulo="Modo jugador"
        detalle="Tus equipos, los torneos que jugás y tu perfil."
        elegida={esJugador}
      />
      <Opcion
        href="/organizador/gestionar"
        titulo="Modo organizador"
        detalle="Los torneos que organizás, tu equipo de trabajo y la organización."
        elegida={!esJugador}
      />
    </HojaDeOpciones>
  );
}

function Opcion({
  href,
  titulo,
  detalle,
  elegida,
}: {
  href: string;
  titulo: string;
  detalle: string;
  elegida: boolean;
}) {
  const cuerpo = <CuerpoDeOpcion titulo={titulo} detalle={detalle} elegida={elegida} />;

  // El modo actual no es un enlace: no lleva a ningún lado y, siendo la
  // ruta en la que ya estás, tocarlo dejaría la hoja abierta.
  if (elegida) {
    return (
      <span className={claseDeOpcion(true)} aria-current="true">
        {cuerpo}
      </span>
    );
  }

  return (
    <Link href={href} className={claseDeOpcion(false)}>
      {cuerpo}
    </Link>
  );
}
