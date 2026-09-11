'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
}

const ROLES = [
  { valor: 'player', etiqueta: 'Jugador' },
  { valor: 'coach', etiqueta: 'DT' },
  { valor: 'delegate', etiqueta: 'Delegado' },
];

/**
 * UC-11 — cliente de `POST /api/equipos/invitar`. Un rol por invitación
 * (el backend acepta varios a la vez, pero invitar dos veces a la misma
 * persona es idempotente — reenvía el acceso en vez de duplicar — así
 * que sumar un segundo rol después es solo invitar de nuevo). Solo por
 * nombre: no hay buscador de perfiles existentes todavía (ningún
 * servicio de backend lo soporta), así que esto siempre crea un perfil
 * sin reclamar nuevo si el nombre no coincide con nadie invitado antes
 * en este mismo equipo — el aviso de nombre duplicado, si aparece, es
 * la única pista de que quizás ya existía.
 */
export function FormularioInvitarIntegrante({ equipoId }: Props) {
  const router = useRouter();
  const [nombreVisible, setNombreVisible] = useState('');
  const [rol, setRol] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const formularioValido = nombreVisible.trim() !== '' && rol !== '';

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formularioValido) return;
    setEnviando(true);
    setError(null);
    setAviso(null);

    try {
      const respuesta = await fetch('/api/equipos/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, roles: [rol], nombreVisible }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo invitar. Probá de nuevo.');
        setEnviando(false);
        return;
      }
      if (cuerpo.data?.advertenciaNombreDuplicado) {
        setAviso('Ya había un perfil con ese nombre — revisá que no sea la misma persona.');
        setEnviando(false);
        return;
      }
      router.push(`/equipo/${equipoId}/gestionar`);
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formulario} onSubmit={enviar}>
      {error && <p className={styles.errorChico}>{error}</p>}
      {aviso && <p className={styles.avisoChico}>{aviso}</p>}

      <div className={styles.campo}>
        <label htmlFor="nombreVisible">Nombre o correo</label>
        <input
          id="nombreVisible"
          type="text"
          placeholder="Buscá en la plataforma, o cargalo directo"
          value={nombreVisible}
          onChange={(evento) => setNombreVisible(evento.target.value)}
        />
        <p className={styles.ayuda}>
          Si no tiene cuenta, queda como perfil sin cuenta asociada — lo puede reclamar después
          (UC-05).
        </p>
      </div>

      <div className={styles.campo}>
        <label id="rol-label">Rol</label>
        <div className={styles.segmentado} role="radiogroup" aria-labelledby="rol-label">
          {ROLES.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              role="radio"
              aria-checked={rol === opcion.valor}
              className={`${styles.segmentoBoton} ${
                rol === opcion.valor ? styles.segmentoBotonActivo : ''
              }`}
              onClick={() => setRol(opcion.valor)}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className={styles.boton} disabled={enviando || !formularioValido}>
        {enviando ? 'Invitando…' : 'Enviar invitación'}
      </button>

      <p className={styles.ayuda}>
        Invitar dos veces a la misma persona no duplica: reenvía el acceso. Las invitaciones no
        vencen.
      </p>
    </form>
  );
}
