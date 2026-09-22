'use client';
import { subirArchivo, validarArchivo, TIPOS_IMAGEN } from '@/lib/subidaCliente';

import { useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Escudo } from '@/components/Escudo';
import styles from './pagina.module.css';

interface Props {
  organizacionId: string;
  nombre: string;
  logoUrl: string | null;
}

/**
 * Affordance de logo del propio perfil ("Logo or browse files" del
 * mockup): sube directo a `/api/organizaciones/logo` y refresca el
 * Server Component para que el resto de la pantalla (y el perfil
 * público real) vean el logo nuevo sin recargar la página entera.
 */
export function SubidaLogoOrganizacion({ organizacionId, nombre, logoUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previsualizacion, setPrevisualizacion] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    const problema = validarArchivo(archivo, TIPOS_IMAGEN);
    if (problema) {
      setError(problema);
      return;
    }

    setPrevisualizacion(URL.createObjectURL(archivo));
    setSubiendo(true);
    setError(null);

    const datosFormulario = new FormData();
    datosFormulario.append('organizacionId', organizacionId);
    datosFormulario.append('archivo', archivo);

    const resultado = await subirArchivo('/api/organizaciones/logo', datosFormulario);
    setSubiendo(false);
    if (!resultado.ok) {
      // Sin logo nuevo guardado, la previsualización mentiría.
      setPrevisualizacion(null);
      setError(resultado.mensaje);
      return;
    }
    router.refresh();
  }

  return (
    <div className={styles.filaLogo}>
      <Escudo src={previsualizacion ?? logoUrl} nombre={nombre} tamano={72} />
      <div className={styles.columnaLogo}>
        <button
          type="button"
          className={styles.enlaceLogo}
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
        >
          {subiendo ? 'Subiendo…' : logoUrl || previsualizacion ? 'Cambiar logo' : 'Subir logo'}
        </button>
        {error && <span className={styles.errorLogo}>{error}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={elegirArchivo}
      />
    </div>
  );
}
