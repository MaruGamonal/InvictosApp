'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './NavInferiorOrganizador.module.css';

const PESTANAS = [
  {
    segmento: '',
    etiqueta: 'Inicio',
    icono: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />,
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
    segmento: 'torneos',
    etiqueta: 'Torneos',
    icono: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" />
        <path d="m8.5 8.5 7 7M15.5 8.5l-7 7" />
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
 * separado de `NavInferior` (Jugador): Inicio · Equipo · Torneos ·
 * Perfil.
 *
 * Tenía cinco pestañas, y dos de ellas —"Crear org." e "Invitar
 * admin"— no eran lugares sino acciones: un menú se navega, una acción
 * se ejecuta una vez. Reportado en vivo. Las dos rutas siguen
 * existiendo, pero se llega por su llamada a la acción, desde donde
 * tienen sentido: crear la organización, cuando todavía no hay ninguna;
 * invitar a un Administrador, desde Equipo de trabajo.
 *
 * "Transferir" sigue deliberadamente afuera (sin mockup, sin backend,
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
