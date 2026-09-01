'use client';

import { useState } from 'react';

/**
 * Prueba en vivo de que el tema es tokenizado (T6, "cómo demostrarlo"):
 * cambia el valor del token de acento en el documento — no en ningún
 * componente — y todo el catálogo que lo usa cambia con él.
 */
export function CambiarAcento() {
  const [color, setColor] = useState('#00a8cc');

  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      Probar otro acento (token --acento, en vivo):
      <input
        type="color"
        value={color}
        onChange={(evento) => {
          const nuevoColor = evento.target.value;
          setColor(nuevoColor);
          document.documentElement.style.setProperty('--acento', nuevoColor);
        }}
      />
    </label>
  );
}
