'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pagina.module.css';

interface Props {
  equipoId: string;
}

const ROLES = [
  { valor: 'player', etiqueta: 'Jugador' },
  { valor: 'delegate', etiqueta: 'Delegado' },
  { valor: 'coach', etiqueta: 'DT' },
];

/**
 * UC-11 — cliente de `POST /api/equipos/invitar`. Solo por nombre: no
 * hay buscador de perfiles existentes todavía (ningún servicio de
 * backend lo soporta), así que esto siempre crea un perfil sin
 * reclamar nuevo si el nombre no coincide con nadie invitado antes en
 * este mismo equipo — el aviso de nombre duplicado, si aparece, es la
 * única pista de que quizás ya existía.
 */
export function FormularioInvitarIntegrante({ equipoId }: Props) {
  const router = useRouter();
  const [nombreVisible, setNombreVisible] = useState('');
  const [roles, setRoles] = useState<string[]>(['player']);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function alternarRol(rol: string) {
    setRoles((actuales) =>
      actuales.includes(rol) ? actuales.filter((r) => r !== rol) : [...actuales, rol],
    );
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (roles.length === 0) {
      setError('Elegí al menos un rol.');
      return;
    }
    setEnviando(true);
    setError(null);
    setAviso(null);

    try {
      const respuesta = await fetch('/api/equipos/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipoId, roles, nombreVisible }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok || !cuerpo.ok) {
        setError(cuerpo?.error?.mensaje ?? 'No se pudo invitar. Probá de nuevo.');
        setEnviando(false);
        return;
      }
      if (cuerpo.data?.advertenciaNombreDuplicado) {
        setAviso('Ya había un perfil con ese nombre — revisá que no sea la misma persona.');
      }
      setNombreVisible('');
      router.refresh();
    } catch {
      setError('No pudimos conectar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className={styles.formularioChico} onSubmit={enviar}>
      <p className={styles.textoAyuda}>
        Buscá a la persona en la plataforma o escribí su nombre directamente — si nadie coincide,
        le creamos un perfil para que lo reclame cuando entre.
      </p>

      {error && <p className={styles.errorChico}>{error}</p>}
      {aviso && <p className={styles.avisoChico}>{aviso}</p>}

      <input
        type="text"
        required
        placeholder="Nombre de la persona"
        value={nombreVisible}
        onChange={(evento) => setNombreVisible(evento.target.value)}
      />

      <div className={styles.chipsRoles}>
        {ROLES.map((opcion) => (
          <label key={opcion.valor} className={styles.chipRol}>
            <input
              type="checkbox"
              checked={roles.includes(opcion.valor)}
              onChange={() => alternarRol(opcion.valor)}
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>

      <button type="submit" disabled={enviando}>
        {enviando ? 'Invitando…' : 'Invitar'}
      </button>
    </form>
  );
}
