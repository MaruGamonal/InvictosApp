'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CampoPassword } from '@/components/CampoPassword';
import styles from '../../ingresar/pagina.module.css';

const CLAVE_LOCAL_STORAGE = 'invicta-admin-secreto';

type Estado =
  | { paso: 'formulario' }
  | { paso: 'enviando' }
  | { paso: 'listo' }
  | { paso: 'error'; mensaje: string };

/**
 * Cliente de `POST /api/admin/sembrar-demo`. El secreto se guarda en
 * `localStorage` del navegador (nunca sale de acá, ni se manda a
 * ningún lado más que a ese POST) para no tener que pegarlo cada vez.
 */
export function FormularioSembrarDemo() {
  const [secreto, setSecreto] = useState('');
  const [estado, setEstado] = useState<Estado>({ paso: 'formulario' });

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_LOCAL_STORAGE);
      if (guardado) setSecreto(guardado);
    } catch {
      // localStorage puede no estar disponible (navegación privada); no es grave acá.
    }
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado({ paso: 'enviando' });

    try {
      const respuesta = await fetch('/api/admin/sembrar-demo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secreto}` },
      });
      const cuerpo = await respuesta.json().catch(() => null);

      if (!respuesta.ok || !cuerpo?.ok) {
        setEstado({
          paso: 'error',
          mensaje:
            respuesta.status === 403
              ? 'Ese secreto no es correcto — copiá de nuevo el valor de CRON_SECRET desde Vercel.'
              : (cuerpo?.error?.mensaje ?? 'Algo salió mal. Probá de nuevo.'),
        });
        return;
      }

      try {
        window.localStorage.setItem(CLAVE_LOCAL_STORAGE, secreto);
      } catch {
        // igual, no es grave si no se pudo guardar.
      }
      setEstado({ paso: 'listo' });
    } catch {
      setEstado({
        paso: 'error',
        mensaje: 'No pudimos conectar. Revisá tu conexión e intentá de nuevo.',
      });
    }
  }

  return (
    <form className={styles.tarjeta} onSubmit={enviar}>
      <h1 className={`fuente-display ${styles.titulo}`}>Sembrar datos de demo</h1>
      <p className={styles.texto}>
        Carga torneos y equipos de prueba en la base de datos conectada a esta app — la de
        producción, si estás viendo esto en tu dominio de Vercel. Puede tardar un rato.
      </p>

      {estado.paso === 'error' && <p className={styles.error}>{estado.mensaje}</p>}
      {estado.paso === 'listo' && (
        <p className={styles.ayuda}>
          Listo. Andá a /torneos y elegí una de las ciudades de la demo para verlos.
        </p>
      )}

      <div className={styles.campo}>
        <label htmlFor="secreto">CRON_SECRET</label>
        <CampoPassword id="secreto" required value={secreto} onChange={setSecreto} />
        <span className={styles.ayuda}>
          El mismo valor que ya tenés cargado en Vercel → tu proyecto → Settings → Environment
          Variables.
        </span>
      </div>

      <button type="submit" className={styles.boton} disabled={estado.paso === 'enviando'}>
        {estado.paso === 'enviando' ? 'Sembrando… (puede tardar)' : 'Sembrar datos de demo'}
      </button>
    </form>
  );
}
