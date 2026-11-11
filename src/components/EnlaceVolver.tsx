'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './EnlaceVolver.module.css';

/**
 * "← Volver" para las pantallas sin otra salida visible: formularios
 * (crear equipo o torneo, editar perfil), ingresar y gestionar un equipo.
 * Sin esto la única salida era el botón del teléfono, que no todos usan
 * y que en una app instalada a veces no está (`05`, principio 5: ninguna
 * pantalla sin salida).
 *
 * Vuelve a donde estaba la persona si llegó navegando la app, y si
 * llegó de afuera —un link de WhatsApp, un mail— va a `alternativa`, en
 * vez de sacarla de la aplicación.
 */
export function EnlaceVolver({ alternativa }: { alternativa: string }) {
  const router = useRouter();

  return (
    <Link
      href={alternativa}
      className={styles.enlace}
      onClick={(evento) => {
        const vieneDeLaApp =
          typeof document !== 'undefined' &&
          document.referrer.startsWith(window.location.origin) &&
          window.history.length > 1;
        if (vieneDeLaApp) {
          evento.preventDefault();
          router.back();
        }
      }}
    >
      ← Volver
    </Link>
  );
}
