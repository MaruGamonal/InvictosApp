'use client';

import { useState } from 'react';
import styles from './CampoPassword.module.css';

export interface CampoPasswordProps {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoComplete?: string;
}

/**
 * Input de contraseña con botón para mostrar/ocultar lo tipeado, así se
 * puede verificar sin tener que escribirla dos veces. El padding extra
 * va como estilo inline (no en el módulo CSS) para no depender de qué
 * regla de `.campo input` del formulario que lo use gane la cascada.
 */
export function CampoPassword({
  id,
  value,
  onChange,
  required,
  minLength,
  placeholder,
  autoComplete,
}: CampoPasswordProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.envoltorio}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={() => setVisible((actual) => !actual)}
        className={styles.boton}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        {visible ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
            <path d="M3 3l18 18" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
