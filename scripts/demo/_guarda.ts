import { obtenerAmbiente } from '@/lib/ambiente';

/**
 * La puerta de los scripts de datos demo.
 *
 * Hasta acá, `npm run demo:sembrar` sembraba contra lo que dijera
 * `DATABASE_URL` y nada más. Mientras hubo una sola base eso era un
 * riesgo teórico; con un ambiente de pruebas al lado deja de serlo: dos
 * `.env` parecidos, uno apuntando a cada lado, y la distancia entre
 * sembrar el ambiente correcto y llenar producción de `[DEMO]` es
 * acordarse de cuál está abierto.
 *
 * El accidente, además, **no es simétrico**: un ambiente de pruebas sin
 * datos se resiembra en un minuto; producción con datos de mentira
 * mezclados entre torneos de gente real se limpia con `demo:limpiar`,
 * sí, pero sólo si nadie los tocó antes — y mientras tanto los vio todo
 * el mundo. Por eso la guarda es explícita y no una heurística sobre la
 * URL de la base.
 *
 * `NEXT_PUBLIC_AMBIENTE=pruebas` es la misma variable que prende la
 * banda de la aplicación. Una sola fuente: si el sitio no se está
 * declarando ambiente de pruebas, estos scripts no corren ahí.
 */

/** Para que el mensaje diga a qué base iba, sin exponer la contraseña. */
export function describirBase(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'DATABASE_URL no está configurada';
  try {
    const { hostname, port, pathname } = new URL(url);
    return `${hostname}${port ? `:${port}` : ''}${pathname}`;
  } catch {
    return 'DATABASE_URL no se pudo interpretar';
  }
}

/**
 * Corta el proceso salvo que el ambiente se declare de pruebas.
 *
 * Imprime siempre a qué base iba a escribir: el error más fácil de
 * cometer acá no es ignorar una advertencia, es tener el `.env`
 * equivocado y no darse cuenta.
 */
export function exigirAmbienteDePruebas(accion: string): void {
  const ambiente = obtenerAmbiente();
  console.log(`  ambiente: ${ambiente}`);
  console.log(`  base:     ${describirBase()}`);

  if (ambiente === 'pruebas') return;

  console.error(
    `\nMe niego a ${accion}: este ambiente no se declara de pruebas.\n\n` +
      'Los datos demo sólo van donde NEXT_PUBLIC_AMBIENTE=pruebas — la misma\n' +
      'variable que prende la banda de "ambiente de pruebas" en la aplicación.\n' +
      'Si esto tendría que haber corrido, revisá contra qué base apunta\n' +
      'DATABASE_URL antes de tocar la variable: el default es producción\n' +
      'justamente para que un .env equivocado no termine en datos [DEMO]\n' +
      'mezclados con torneos reales.',
  );
  process.exit(1);
}
