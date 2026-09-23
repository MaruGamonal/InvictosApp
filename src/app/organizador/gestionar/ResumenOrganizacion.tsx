import { Escudo } from '@/components/Escudo';
import { Badge } from '@/components/Badge';
import { BotonVerificarOrganizacion } from '@/components/BotonVerificarOrganizacion';
import styles from './ResumenOrganizacion.module.css';

export interface ResumenOrganizacionProps {
  organizacionId: string;
  nombre: string;
  logoUrl: string | null;
  nivelVerificacion: 'unverified' | 'basic' | 'trusted';
  soyTitular: boolean;
  limitePublicadosAlcanzado: boolean;
  torneos: number;
  activos: number;
  equipos: number;
}

/**
 * La organización activa, arriba de todo: quién es, en qué estado está
 * y cuánto sostiene.
 *
 * Los números estaban en una sola línea —"0 activos · 1 por comenzar ·
 * 0 finalizados"— que hay que leer entera para sacar un dato. Acá son
 * tres cifras separadas, cada una con su etiqueta: se escanean de un
 * vistazo sin leer.
 *
 * El estado de verificación y esos números viven en filas distintas
 * porque responden preguntas distintas ("¿puedo publicar?" y "¿cuánto
 * tengo?") y mezclarlos obligaba a desenredarlos.
 */
export function ResumenOrganizacion({
  organizacionId,
  nombre,
  logoUrl,
  nivelVerificacion,
  soyTitular,
  limitePublicadosAlcanzado,
  torneos,
  activos,
  equipos,
}: ResumenOrganizacionProps) {
  const verificada = nivelVerificacion !== 'unverified';

  return (
    <section className={styles.tarjeta} aria-labelledby="resumen-organizacion">
      <div className={styles.identidad}>
        <Escudo src={logoUrl} nombre={nombre} tamano={48} />
        <div className={styles.textos}>
          <h2 id="resumen-organizacion" className={`fuente-display ${styles.nombre}`}>
            {nombre}
          </h2>
          <Badge campo="organizacion.nivelVerificacion" valor={nivelVerificacion} conPunto />
        </div>
      </div>

      <dl className={styles.cifras}>
        <div className={styles.cifra}>
          <dt className={styles.cifraEtiqueta}>Torneos</dt>
          <dd className={`fuente-display ${styles.cifraValor}`}>{torneos}</dd>
        </div>
        <div className={styles.cifra}>
          <dt className={styles.cifraEtiqueta}>Activos</dt>
          <dd className={`fuente-display ${styles.cifraValor}`}>{activos}</dd>
        </div>
        <div className={styles.cifra}>
          <dt className={styles.cifraEtiqueta}>Equipos</dt>
          <dd className={`fuente-display ${styles.cifraValor}`}>{equipos}</dd>
        </div>
      </dl>

      {/* Sin verificar la organización funciona igual: lo que cambia es
          que sus torneos no entran al descubrimiento y que puede tener
          uno publicado a la vez (`06`, D-51). El aviso dice cuál de las
          dos cosas está pasando ahora, no las dos siempre. */}
      {!verificada && (
        <div className={styles.pendiente}>
          <p className={styles.pendienteTitulo}>
            <span aria-hidden>⚠</span> Organización pendiente de verificación
          </p>
          <p className={styles.pendienteTexto}>
            {limitePublicadosAlcanzado
              ? 'Ya tenés un torneo publicado. Hasta verificar la organización no vas a poder publicar otro, y los que tengas no aparecen en las búsquedas.'
              : 'Podés crear y publicar un torneo, pero no va a aparecer en las búsquedas hasta que verifiques la organización.'}
          </p>
          <BotonVerificarOrganizacion
            organizacionId={organizacionId}
            soyTitular={soyTitular}
            etiqueta="Verificar organización"
          />
        </div>
      )}
    </section>
  );
}
