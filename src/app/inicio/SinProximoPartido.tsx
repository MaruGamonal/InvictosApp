import Link from 'next/link';
import styles from './pagina.module.css';

/**
 * El bloque de "próximo partido" cuando no hay uno con fecha.
 *
 * Decía siempre "Sin partido programado — descubrí otro torneo para tu
 * equipo", también a quien juega un torneo en curso cuya próxima fecha
 * todavía no se programó: lo mandaba a buscar otro torneo en vez de
 * decirle que el suyo sigue (`05`, principio 4: "mi próximo partido" es
 * la segunda pantalla más importante; principio 5: el paso siguiente
 * concreto). Ahora distingue los tres casos.
 */
export function SinProximoPartido({
  torneos,
}: {
  torneos: Array<{ torneoId: string; nombre: string; estado: string }>;
}) {
  const enCurso = torneos.find((torneo) => torneo.estado === 'in_progress');
  const porEmpezar = torneos.find(
    (torneo) => torneo.estado === 'registration_open' || torneo.estado === 'registration_closed',
  );

  const { titulo, texto, enlace, accion } = enCurso
    ? {
        titulo: 'Tu próximo partido no tiene fecha',
        texto: `En ${enCurso.nombre} todavía no se programó. Cuando tenga día y hora, aparece acá.`,
        enlace: `/torneo/${enCurso.torneoId}/fixture`,
        accion: 'Ver el fixture',
      }
    : porEmpezar
      ? {
          titulo: 'Tu torneo todavía no empezó',
          texto: `${porEmpezar.nombre} arranca cuando el organizador arme el fixture. Te avisamos.`,
          enlace: `/torneo/${porEmpezar.torneoId}`,
          accion: 'Ver el torneo',
        }
      : {
          titulo: 'Sin partido programado',
          texto: 'Mientras tanto, descubrí otro torneo para tu equipo.',
          enlace: '/torneos',
          accion: 'Descubrir torneos',
        };

  return (
    <div className={styles.pasoSiguiente}>
      <div className={`fuente-display ${styles.pasoSiguienteTitulo}`}>{titulo}</div>
      <p className={styles.pasoSiguienteTexto}>{texto}</p>
      <Link href={enlace} className={styles.pasoSiguienteBoton}>
        {accion}
      </Link>
    </div>
  );
}
