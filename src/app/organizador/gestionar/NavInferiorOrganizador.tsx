'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './NavInferiorOrganizador.module.css';

const PESTANAS = [
  {
    segmento: '',
    etiqueta: 'Home',
    icono: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
  },
  {
    segmento: 'crear',
    etiqueta: 'Crear org.',
    icono: (
      <>
        <rect x="4" y="10" width="16" height="10" rx="1" />
        <path d="M9 20v-5h6v5M9 10V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
      </>
    ),
  },
  {
    segmento: 'equipo',
    etiqueta: 'Equipo',
    icono: (
      <>
        <circle cx="8.5" cy="8" r="3" />
        <circle cx="16" cy="9" r="2.5" />
        <path d="M3 20c0-3 2.5-5.5 5.5-5.5S14 17 14 20" />
        <path d="M14.5 14.8c2.5.3 4.5 2.4 4.5 5.2" />
      </>
    ),
  },
  {
    segmento: 'invitar',
    etiqueta: 'Invitar admin',
    icono: (
      <>
        <circle cx="9" cy="9" r="3.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M18 8v6M15 11h6" />
      </>
    ),
  },
  {
    segmento: 'perfil',
    etiqueta: 'Perfil',
    icono: (
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
  },
] as const;

/**
 * Bottom nav propio del panel de Organizador (`/organizador/gestionar`),
 * separado de `NavInferior` (Jugador): cinco secciones fijas —
 * "Transferir" queda deliberadamente afuera (sin mockup, sin backend,
 * confirmado explícitamente con quien pidió la pantalla).
 */
export function NavInferiorOrganizador() {
  const pathname = usePathname();

  return (
    <>
      <div className={styles.espaciador} aria-hidden />
      <nav className={styles.nav} aria-label="Navegación del panel de organizador">
        {PESTANAS.map((pestana) => {
          const href = pestana.segmento
            ? `/organizador/gestionar/${pestana.segmento}`
            : '/organizador/gestionar';
          const activa = pathname === href;
          return (
            <Link
              key={pestana.segmento}
              href={href}
              className={activa ? styles.pestanaActiva : styles.pestana}
              aria-current={activa ? 'page' : undefined}
            >
              <svg
                width="21"
                height="21"
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
          );
        })}
      </nav>
    </>
  );
}
