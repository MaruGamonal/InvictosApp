// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CompartirBoton } from './CompartirBoton';

describe('CompartirBoton', () => {
  afterEach(() => {
    cleanup();
    // @ts-expect-error -- limpiar lo que cada test agregó a navigator
    delete navigator.share;
    // @ts-expect-error -- idem
    delete navigator.clipboard;
  });

  it('usa el Web Share nativo cuando existe, con el título y la URL exactos', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    navigator.share = share;

    const { getByRole } = render(
      <CompartirBoton titulo="Copa Otoño F5" url="https://invicta.com.ar/torneo/1" />,
    );
    fireEvent.click(getByRole('button', { name: 'Compartir' }));

    await vi.waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        title: 'Copa Otoño F5',
        url: 'https://invicta.com.ar/torneo/1',
      });
    });
  });

  it('sin Web Share, copia el link al portapapeles', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // happy-dom ya define navigator.clipboard como getter: hay que reemplazarlo con defineProperty.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const { getByRole } = render(
      <CompartirBoton titulo="Copa Otoño F5" url="https://invicta.com.ar/torneo/1" />,
    );
    fireEvent.click(getByRole('button', { name: 'Compartir' }));

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://invicta.com.ar/torneo/1');
    });
  });
});
