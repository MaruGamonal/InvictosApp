import Link from 'next/link';
import styles from './NavInferior.module.css';

export type PestanaNavInferior = 'inicio' | 'buscar' | 'torneos' | 'perfil';

const PESTANAS: Array<{
  id: PestanaNavInferior;
  href: string;
  etiqueta: string;
  icono: JSX.Element;
}> = [
  {
    id: 'inicio',
    href: '/inicio',
    etiqueta: 'Inicio',
    icono: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
  },
  {
    id: 'buscar',
    // No hay pantalla de búsqueda propia todavía — reusa Descubrimiento,
    // que ya tiene su propio filtro (`/torneos`).
    href: '/torneos',
    etiqueta: 'Buscar',
    icono: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
  },
  {
    id: 'torneos',
    href: '/torneos',
    etiqueta: 'Torneos',
    icono: (
      <>
        <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
        <path d="M8 5.5H5v1.5a3 3 0 0 0 3 3M16 5.5h3V7a3 3 0 0 1-3 3" />
        <path d="M12 13v3M9 20h6" />
      </>
    ),
  },
  {
    id: 'perfil',
    href: '/perfil',
    etiqueta: 'Perfil',
    icono: (
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
  },
];

/**
 * Bottom nav de 4 tabs (`Invictos - Inicio.dc.html`): Inicio, Buscar,
 * Torneos, Perfil. "Buscar" no tiene pantalla dedicada en el producto
 * todavía —comparte destino con "Torneos"— así que por ahora se
 * distingue solo por el ícono resaltado, no por a dónde lleva.
 *
 * Se coloca al final de cada pantalla autenticada; el espaciador de
 * arriba evita que el contenido quede tapado detrás de la barra fija.
 */
export function NavInferior({ activo }: { activo: PestanaNavInferior }) {
  return (
    <>
      <div className={styles.espaciador} aria-hidden />
      <nav className={styles.nav} aria-label="Navegación principal">
        {PESTANAS.map((pestana) => (
          <Link
            key={pestana.id}
            href={pestana.href}
            className={pestana.id === activo ? styles.pestanaActiva : styles.pestana}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {pestana.icono}
            </svg>
            <span>{pestana.etiqueta}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
