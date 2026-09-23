'use client';

import Link from 'next/link';
import { useSesion } from './useSesion';
import styles from './NavInferior.module.css';

export type PestanaNavInferior = 'inicio' | 'equipos' | 'torneos' | 'perfil';

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
    id: 'equipos',
    href: '/equipos',
    etiqueta: 'Equipos',
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
 * Bottom nav de 4 tabs (`Invictos - Inicio.dc.html`): Inicio, Equipos,
 * Torneos, Perfil — "Buscar" pasó a ser "Equipos" (reportado en vivo:
 * los dos ítems llevaban al mismo lugar, y lo que hacía falta era poder
 * buscar equipos, no un buscador genérico sin pantalla propia).
 *
 * Cliente, no de servidor: las páginas donde vive (`/torneos`,
 * `/torneo/[id]`, `/equipo/[id]`) son públicas y cacheadas por evento
 * (D-04b) — no saben si quien mira tiene sesión. Este componente sí
 * puede preguntarlo, con la sesión real, y se queda oculto mientras no
 * confirme que hay cuenta: reportado en vivo, un visitante sin ingresar
 * no debería ver un nav pensado para navegar la cuenta.
 *
 * **`autenticado` como prop es el camino rápido.** Las pantallas que ya
 * exigen sesión en el servidor (`/inicio`, `/perfil`,
 * `/notificaciones`, que redirigen a "Ingresar" si no la hay) lo saben
 * antes de dibujar: pasándolo, el nav sale con la página y no hay ni
 * espera ni pedido. Sin la prop —en las pantallas públicas, donde el
 * servidor de verdad no sabe— se pregunta, pero recordando la respuesta
 * entre pantallas (`useSesion`), así que el nav aparece igual en el
 * primer render a partir de la segunda.
 *
 * Reportado en vivo: "en el modo jugador el menú tiene un delay en cada
 * pantalla". Eran las dos cosas juntas —un pedido por montaje y nada
 * dibujado hasta que contestara—, en pantallas donde encima la
 * respuesta ya se conocía.
 */
export function NavInferior({
  activo,
  autenticado: autenticadoDesdeElServidor,
}: {
  activo: PestanaNavInferior;
  /** Lo que el servidor ya sabe; sin esto se pregunta desde el cliente. */
  autenticado?: boolean;
}) {
  // Con la respuesta del servidor no se pregunta nada: el hook se apaga.
  const autenticadoConsultado = useSesion(autenticadoDesdeElServidor === undefined);
  const autenticado = autenticadoDesdeElServidor ?? autenticadoConsultado;

  if (!autenticado) return null;

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
