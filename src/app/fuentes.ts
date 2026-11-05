import { Barlow, Barlow_Condensed } from 'next/font/google';

/**
 * Las dos familias del sistema (`08`, 7), en un solo lugar: las usan el
 * layout raíz y `global-error.tsx`, que reemplaza a ese layout y sin
 * esto se quedaba sin fuentes — `--fuente-display` apunta a una
 * variable que define `next/font` con la clase en `<html>`, y sin esa
 * clase la declaración entera queda inválida.
 */
export const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

export const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

/** Las clases que van en `<html>` para que existan las variables de las fuentes. */
export const clasesDeFuentes = `${barlow.variable} ${barlowCondensed.variable}`;
