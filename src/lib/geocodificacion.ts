import { verificarLimite } from './limiteFrecuencia';

export interface DireccionEncontrada {
  direccion: string;
  latitud: number;
  longitud: number;
}

interface FilaNominatim {
  display_name: string;
  lat: string;
  lon: string;
}

const LIMITE_BUSQUEDA = { maximoIntentos: 2, ventanaMs: 1000 };

/**
 * Autocompletar de dirección al crear un torneo (D-52), vía Nominatim
 * (OpenStreetMap) — reemplaza a Google Places, sin presupuesto para Maps.
 * El límite de acá es a nivel de toda la app, no por usuario: el buscador
 * del cliente ya espacía sus propios pedidos con debounce, esto es la
 * segunda capa, respetando la política de uso de Nominatim (como mucho
 * ~1 request/segundo desde toda la app). Superado el límite, o si la
 * búsqueda falla por cualquier motivo, devuelve `[]` en vez de tirar
 * error — la dirección es opcional y nunca bloquea crear el torneo.
 */
export async function buscarDirecciones(consulta: string): Promise<DireccionEncontrada[]> {
  if (!verificarLimite('nominatim-busqueda', LIMITE_BUSQUEDA)) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', consulta);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('countrycodes', 'ar');
  url.searchParams.set('limit', '5');

  const sitio = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  try {
    // Nominatim exige un User-Agent que identifique la aplicación — el
    // genérico de fetch/undici no cumple su política de uso.
    const respuesta = await fetch(url, {
      headers: { 'User-Agent': `InvictaApp/1.0 (${sitio})` },
    });
    if (!respuesta.ok) return [];

    const filas = (await respuesta.json()) as FilaNominatim[];
    return filas.map((fila) => ({
      direccion: fila.display_name,
      latitud: Number(fila.lat),
      longitud: Number(fila.lon),
    }));
  } catch {
    return [];
  }
}
