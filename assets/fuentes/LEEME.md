# Fuentes para imágenes generadas

Barlow Condensed Bold y Barlow SemiBold, en TTF, para las imágenes que
se dibujan en el servidor (`opengraph-image.tsx`). Son las mismas
familias que la aplicación carga con `next/font` (`src/app/fuentes.ts`),
pero el generador de imágenes (`next/og`) no puede usar esas: necesita
el archivo de la fuente, y en TTF u OTF, no en WOFF2.

Origen: [google/fonts](https://github.com/google/fonts/tree/main/ofl),
`ofl/barlowcondensed/BarlowCondensed-Bold.ttf` y
`ofl/barlow/Barlow-SemiBold.ttf`. Licencia SIL Open Font License 1.1
(`LICENCIA-OFL.txt`): se pueden redistribuir con el producto.
