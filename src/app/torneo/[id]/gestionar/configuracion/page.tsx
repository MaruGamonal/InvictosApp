import type { Metadata } from 'next';
import Link from 'next/link';
import { conNombreProducto } from '@/lib/nombreProducto';
import { Badge } from '@/components/Badge';
import { listarReglamentos } from '@/services/torneos/listarReglamentos';
import { listarColaboradoresTorneo } from '@/services/organizadores/listarColaboradoresTorneo';
import { listarMiembros } from '@/services/organizadores/listarMiembros';
import { obtenerContextoCacheado, obtenerGestionCacheada } from '../_datos';
import { ESTADOS_CON_ACCIONES_DE_ESTADO } from '../_estadosDeTorneo';
import { SECCIONES_CONFIGURACION, type SeccionConfiguracion } from './_secciones';
import styles from './pagina.module.css';

export const metadata: Metadata = { title: conNombreProducto('Configuración del torneo') };

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}

function contar(cantidad: number, singular: string, plural: string, vacio: string): string {
  if (cantidad === 0) return vacio;
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

/**
 * El menú de Configuración: una fila por sección, con el estado actual
 * de cada una, y cada sección en su propia pantalla.
 *
 * **Qué reemplaza.** Siete acordeones en una sola página. Para llegar al
 * último había que pasar por encima de los otros seis, el estado de cada
 * uno estaba escondido hasta abrirlo —no se podía saber si el formato
 * estaba definido sin abrir "Formato"— y la pantalla no tenía forma de
 * decir qué faltaba configurar. Un acordeón es buena idea cuando el
 * contenido es accesorio; acá cada sección es una tarea.
 *
 * **Por qué el estado va en la fila.** Es el resumen de progreso sin
 * agregar una pantalla de resumen: "Sin definir" al lado de Formato
 * dice lo mismo que diría un cartel aparte, pero en el lugar donde hay
 * algo que hacer al respecto. "Datos del torneo" no lleva estado porque
 * no tiene uno: lo que falta ahí para poder publicar lo dice el Resumen,
 * que es donde está el botón de publicar.
 *
 * **Lo que cuesta.** Las mismas tres consultas que hacía la página
 * larga, porque las necesita para los estados. Cada sección, en cambio,
 * ahora consulta solo lo suyo.
 */
export default async function PaginaConfiguracion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contexto = await obtenerContextoCacheado();
  const [gestion, reglamentos, colaboradores] = await Promise.all([
    obtenerGestionCacheada(id),
    listarReglamentos({ torneoId: id }, contexto),
    listarColaboradoresTorneo({ torneoId: id }, contexto),
  ]);
  const administradores = await listarMiembros(
    { organizacionId: gestion.organizacionId },
    contexto,
  );
  const reglamentoVigente = reglamentos.find((r) => r.estado === 'current') ?? null;

  const fasePrincipal = gestion.fases[0];
  const filas: Array<{ seccion: SeccionConfiguracion; estado: string }> = [
    { seccion: 'datos', estado: 'Nombre, sede, fechas y costos' },
    {
      seccion: 'formato',
      estado: fasePrincipal
        ? `${fasePrincipal.tipoFase === 'league' ? 'Liga' : 'Eliminación directa'}` +
          (fasePrincipal.cantidadGrupos > 1 ? ` · ${fasePrincipal.cantidadGrupos} zonas` : '')
        : 'Sin definir',
    },
    {
      seccion: 'divisiones',
      estado: gestion.certamenId
        ? `${gestion.division ?? 'Sin etiqueta'} · ${contar(
            gestion.divisionesDelCertamen.length + 1,
            'división',
            'divisiones',
            '',
          )}`
        : 'Sin divisiones',
    },
    {
      seccion: 'reglamento',
      estado: reglamentoVigente
        ? `Versión ${reglamentoVigente.numeroVersion} · ${formatearFecha(reglamentoVigente.fechaPublicacion)}`
        : 'Sin publicar',
    },
    {
      seccion: 'colaboradores',
      estado: contar(colaboradores.length, 'asignado', 'asignados', 'Ninguno'),
    },
    {
      seccion: 'administradores',
      estado: contar(administradores.length, 'persona', 'personas', 'Nadie'),
    },
  ];

  return (
    <div className={styles.pagina}>
      <nav className={styles.menu} aria-label="Secciones de configuración">
        {filas.map((fila) => (
          <FilaDeSeccion
            key={fila.seccion}
            torneoId={id}
            seccion={fila.seccion}
            estado={fila.estado}
          />
        ))}

        {/* La sección de estado solo existe mientras haya una transición
            posible: en borrador se publica desde el Resumen, y un torneo
            terminado o cancelado ya no se mueve. */}
        {ESTADOS_CON_ACCIONES_DE_ESTADO.has(gestion.estado) && (
          <FilaDeSeccion
            torneoId={id}
            seccion="estado"
            estado={<Badge campo="torneo.estado" valor={gestion.estado} />}
          />
        )}
      </nav>
    </div>
  );
}

function FilaDeSeccion({
  torneoId,
  seccion,
  estado,
}: {
  torneoId: string;
  seccion: SeccionConfiguracion;
  estado: React.ReactNode;
}) {
  return (
    <Link href={`/torneo/${torneoId}/gestionar/configuracion/${seccion}`} className={styles.fila}>
      <span className={styles.textoFila}>
        <span className={styles.nombreFila}>{SECCIONES_CONFIGURACION[seccion]}</span>
        <span className={styles.estadoFila}>{estado}</span>
      </span>
      <svg
        className={styles.flechaFila}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
