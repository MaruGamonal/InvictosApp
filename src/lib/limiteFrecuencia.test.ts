import { beforeEach, describe, expect, it } from 'vitest';
import { reiniciarLimitesDeFrecuencia, verificarLimite } from './limiteFrecuencia';

const LIMITE = { maximoIntentos: 3, ventanaMs: 1000 };

beforeEach(() => {
  reiniciarLimitesDeFrecuencia();
});

describe('verificarLimite', () => {
  it('permite hasta el máximo de intentos dentro de la ventana', () => {
    expect(verificarLimite('a@example.com', LIMITE, 0)).toBe(true);
    expect(verificarLimite('a@example.com', LIMITE, 100)).toBe(true);
    expect(verificarLimite('a@example.com', LIMITE, 200)).toBe(true);
  });

  it('rechaza el intento que supera el límite', () => {
    verificarLimite('a@example.com', LIMITE, 0);
    verificarLimite('a@example.com', LIMITE, 100);
    verificarLimite('a@example.com', LIMITE, 200);
    expect(verificarLimite('a@example.com', LIMITE, 300)).toBe(false);
  });

  it('cada clave tiene su propio contador', () => {
    verificarLimite('a@example.com', LIMITE, 0);
    verificarLimite('a@example.com', LIMITE, 0);
    verificarLimite('a@example.com', LIMITE, 0);
    expect(verificarLimite('b@example.com', LIMITE, 0)).toBe(true);
  });

  it('libera intentos a medida que la ventana avanza', () => {
    verificarLimite('a@example.com', LIMITE, 0);
    verificarLimite('a@example.com', LIMITE, 100);
    verificarLimite('a@example.com', LIMITE, 200);
    expect(verificarLimite('a@example.com', LIMITE, 300)).toBe(false);

    // Pasó la ventana completa desde todos los intentos anteriores: vuelve a haber lugar.
    expect(verificarLimite('a@example.com', LIMITE, 1500)).toBe(true);
  });
});
