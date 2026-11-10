import type { Metadata } from 'next';
import { EnlaceDeSalida, PantallaDeMensaje } from '@/components/PantallaDeMensaje';
import { conNombreProducto } from '@/lib/nombreProducto';

export const metadata: Metadata = {
  title: conNombreProducto('No encontramos esta página'),
};

/**
 * La página que no existe: un torneo que se borró, un link compartido
 * que quedó viejo o mal copiado. Era el 404 de Next, en inglés y sin
 * salida. Lo más probable es que la persona viniera a ver un torneo, así
 * que la salida principal es descubrir los de su ciudad.
 */
export default function NoEncontrada() {
  return (
    <PantallaDeMensaje
      titulo="Esta página no existe"
      texto="Puede que el link esté mal copiado o que lo que buscabas ya no esté. Los torneos de tu ciudad siguen acá."
      acciones={
        <>
          <EnlaceDeSalida href="/torneos">Ver torneos</EnlaceDeSalida>
          <EnlaceDeSalida href="/" variante="secundaria">
            Ir al inicio
          </EnlaceDeSalida>
        </>
      }
    />
  );
}
