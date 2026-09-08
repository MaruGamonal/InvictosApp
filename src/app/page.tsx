import type { Metadata } from 'next';
import Link from 'next/link';
import { NOMBRE_PRODUCTO, conNombreProducto } from '@/lib/nombreProducto';
import styles from './bienvenida.module.css';

export const metadata: Metadata = {
  title: conNombreProducto(),
  description: 'Armá el fixture, cargá resultados y seguí la tabla. Descubrí torneos cerca tuyo.',
};

/**
 * Pantalla de bienvenida (`docs/diseno/Invictos - Entrada.dc.html`,
 * pantalla "Bienvenida") — pedida explícitamente como la puerta de
 * entrada real, con las tres acciones del diseño: Ingresar, Crear
 * cuenta y descubrir sin cuenta.
 *
 * No contradice D-90 ("la app abre mostrando los torneos... sin que
 * pida nada"): esta pantalla no pide ningún dato, solo ofrece un tercer
 * camino además de los dos de acceso — "Descubrir torneos sin cuenta"
 * lleva directo a `/torneos`, que es exactamente donde D-90 dice que
 * tiene que abrir quien no quiere loguearse.
 *
 * Ingresar y Crear cuenta llevan al mismo formulario (`/ingresar`): el
 * acceso es passwordless (D-52) — no hay contraseña que distinga un
 * login de un alta, así que no hay dos flujos reales que separar, solo
 * dos puertas de entrada al mismo lugar con el copy que corresponde a
 * la intención de cada botón.
 */
export default function PaginaBienvenida() {
  return (
    <div className={styles.pantalla}>
      <div className={styles.marca}>
        <span className={styles.punto} />
        <span className={styles.nombre}>{NOMBRE_PRODUCTO}</span>
      </div>

      <div className={styles.contenido}>
        <h1 className={`fuente-display ${styles.titulo}`}>
          Tu equipo,
          <br />
          tu pasión,
          <br />
          tu app.
        </h1>
        <p className={styles.copy}>
          Armá el fixture, cargá resultados y seguí la tabla. Descubrí torneos cerca tuyo sin
          necesidad de cuenta.
        </p>
      </div>

      <div className={styles.acciones}>
        <Link href="/ingresar?modo=crear" className={styles.botonPrimario}>
          Crear cuenta
        </Link>
        <Link href="/ingresar" className={styles.botonSecundario}>
          Ingresar
        </Link>
        <Link href="/torneos" className={styles.enlaceDescubrir}>
          Descubrir torneos sin cuenta
        </Link>
      </div>
    </div>
  );
}
