import type { Metadata } from 'next';
import Image from 'next/image';
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
 * Ingresar y Crear cuenta llevan al mismo formulario (`/ingresar`), con
 * el campo de contraseña que corresponde a cada uno — solo cambia el
 * copy y a qué ruta se manda el formulario.
 */
export default function PaginaBienvenida() {
  return (
    <div className={styles.pantalla}>
      <div className={styles.foto}>
        <Image
          src="/imagenes/bienvenida-hero.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.fotoImg}
        />
        <div className={styles.fotoDegrade} />
      </div>

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
