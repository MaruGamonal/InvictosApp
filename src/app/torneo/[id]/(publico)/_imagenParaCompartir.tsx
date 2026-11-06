import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { obtenerEtiqueta } from '@/lib/etiquetas';
import { NOMBRE_PRODUCTO } from '@/lib/nombreProducto';
import { COLORES_SEMANTICOS, FONDO_IDENTIDAD, PALETA } from '@/lib/paletaDeImagenes';
import { obtenerFichaOFallar } from '../_datos';

/**
 * La imagen que se ve al pegar el link de un torneo en un grupo de
 * mensajería (`08`, 11.4 **[Definido]**: "imagen, nombre del torneo,
 * estado"; de eso depende la adquisición del producto).
 *
 * Había `og:image` sólo si el torneo tenía una imagen cargada, y la
 * mayoría de los torneos amateur no la carga: el link salía sin
 * imagen. Ahora cada torneo tiene la suya, con la superficie de
 * identidad de la marca (`08`, 6.1).
 *
 * La dibujan los `opengraph-image.tsx` de la ficha y de cada subruta
 * (fixture, tabla, estadísticas, reglamento): cada una define su propio
 * `openGraph`, y Next lo reemplaza entero —imagen incluida— en vez de
 * combinarlo con el del segmento de arriba. Esos links son los que más
 * se comparten ("mirá cómo va la tabla").
 *
 * Si el torneo tiene imagen propia, va a la derecha. Si no se puede
 * bajar a tiempo, la tarjeta sale igual sin ella: un link sin vista
 * previa es peor que una vista previa sin foto.
 */
export const TAMANO = { width: 1200, height: 630 };

/** `next/og` no acepta WOFF2: lee los TTF de `assets/fuentes` (ver su LEEME). */
async function leerFuente(archivo: string): Promise<Buffer> {
  return readFile(join(process.cwd(), 'assets', 'fuentes', archivo));
}

/** La imagen del torneo como data URI, o null si no se puede usar. */
async function imagenDelTorneo(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(2500) });
    const tipo = respuesta.headers.get('content-type') ?? '';
    // El dibujante sólo entiende PNG y JPEG.
    if (!respuesta.ok || !/^image\/(png|jpe?g)/.test(tipo)) return null;
    const datos = Buffer.from(await respuesta.arrayBuffer());
    return `data:${tipo.split(';')[0]};base64,${datos.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Más chico cuanto más largo: un nombre de 60 letras no entra a 84px. */
function tamanoDelNombre(nombre: string): number {
  if (nombre.length <= 24) return 92;
  if (nombre.length <= 40) return 76;
  return 60;
}

export async function dibujarImagenDelTorneo(id: string): Promise<ImageResponse> {
  const ficha = await obtenerFichaOFallar(id);
  const [display, texto, imagen] = await Promise.all([
    leerFuente('BarlowCondensed-Bold.ttf'),
    leerFuente('Barlow-SemiBold.ttf'),
    imagenDelTorneo(ficha.imagenUrl),
  ]);

  const estado = obtenerEtiqueta('torneo.estado', ficha.estado);
  const colorEstado = COLORES_SEMANTICOS[estado.color];
  const datos = [
    obtenerEtiqueta('torneo.modalidad', ficha.modalidad).etiqueta,
    obtenerEtiqueta('torneo.categoriaGenero', ficha.categoriaGenero).etiqueta,
    ficha.ciudad.nombre,
  ].join(' · ');
  const inscripcionAbierta = ficha.estado === 'registration_open';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: FONDO_IDENTIDAD,
        color: PALETA.blanco,
        fontFamily: 'Barlow',
      }}
    >
      {/* La marca, como en la pantalla de entrada. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 22, height: 22, background: PALETA.acento }} />
        <span
          style={{
            fontFamily: 'Barlow Condensed',
            fontSize: 36,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {NOMBRE_PRODUCTO}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          <span
            style={{
              fontFamily: 'Barlow Condensed',
              fontSize: tamanoDelNombre(ficha.nombre),
              lineHeight: 1,
              textTransform: 'uppercase',
              // Tres líneas como mucho; el resto, cortado.
              maxHeight: tamanoDelNombre(ficha.nombre) * 3,
              overflow: 'hidden',
            }}
          >
            {ficha.nombre}
          </span>
          <span style={{ fontSize: 34, color: PALETA.grisClaroSobreOscuro }}>{datos}</span>
        </div>
        {imagen && (
          // eslint-disable-next-line @next/next/no-img-element -- es el dibujante de next/og, no una página
          <img
            src={imagen}
            alt=""
            width={260}
            height={260}
            style={{ borderRadius: 28, objectFit: 'cover' }}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Color semántico + etiqueta del catálogo, como el badge (`08`, 6.3). */}
        <span
          style={{
            display: 'flex',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            padding: '10px 22px',
            borderRadius: 999,
            background: colorEstado.fondo,
            color: colorEstado.texto,
            fontSize: 28,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {estado.etiqueta}
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 28,
            color: PALETA.grisClaroSobreOscuro,
            // Una línea: un nombre de organización largo no empuja el resto.
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {inscripcionAbierta
            ? `${ficha.equiposAprobados} de ${ficha.cupoEquipos} equipos · Organiza ${ficha.organizacion.nombre}`
            : `Organiza ${ficha.organizacion.nombre}`}
        </span>
      </div>
    </div>,
    {
      ...TAMANO,
      fonts: [
        { name: 'Barlow Condensed', data: display, weight: 700, style: 'normal' },
        { name: 'Barlow', data: texto, weight: 600, style: 'normal' },
      ],
    },
  );
}
