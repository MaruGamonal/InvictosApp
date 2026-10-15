// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HojaDeOpciones } from './HojaDeOpciones';
import { claseDeOpcion, CuerpoDeOpcion } from './_opcionesDeHoja';

afterEach(cleanup);

function montar() {
  const { container } = render(
    <HojaDeOpciones
      etiqueta="Modo jugador"
      descripcionDelControl="Modo"
      titulo="Elegí cómo usar esto"
      bajada="Podés cambiar cuando quieras."
    >
      <a href="/otro" className={claseDeOpcion(false)}>
        <CuerpoDeOpcion titulo="Otra opción" detalle="Lo que hay del otro lado." elegida={false} />
      </a>
    </HojaDeOpciones>,
  );
  const detalles = container.querySelector('details')!;
  return { detalles, container };
}

describe('HojaDeOpciones', () => {
  it('arranca cerrada', () => {
    const { detalles } = montar();
    expect(detalles.open).toBe(false);
  });

  it('Escape la cierra', () => {
    const { detalles } = montar();
    detalles.open = true;

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(detalles.open).toBe(false);
  });

  it('tocar afuera la cierra', () => {
    const { detalles } = montar();
    detalles.open = true;

    fireEvent.click(document.body);

    expect(detalles.open).toBe(false);
  });

  it('tocar adentro del panel NO la cierra: elegir no puede ser un accidente', () => {
    const { detalles } = montar();
    detalles.open = true;

    fireEvent.click(screen.getByText('Otra opción'));

    expect(detalles.open).toBe(true);
  });

  it('tocar el disparador la abre: el cierre de afuera no le gana al toggle nativo', () => {
    // El toque del `summary` abre el `<details>` de forma nativa y
    // **después** burbujea hasta el manejador de "tocar afuera". Sin la
    // guarda que lo deja pasar, ese manejador lo cerraría en el mismo
    // evento y la hoja no se abriría nunca. Es el riesgo real acá.
    const { detalles, container } = montar();
    expect(detalles.open).toBe(false);

    fireEvent.click(container.querySelector('summary')!);

    expect(detalles.open).toBe(true);
  });

  it('tocar el disparador de nuevo la cierra (toggle nativo)', () => {
    const { detalles, container } = montar();
    detalles.open = true;

    fireEvent.click(container.querySelector('summary')!);

    expect(detalles.open).toBe(false);
  });

  it('el disparador se nombra con lo que es y con el valor puesto', () => {
    montar();
    expect(screen.getByLabelText('Modo: Modo jugador')).toBeInTheDocument();
  });

  it('deja de escuchar al desmontarse', () => {
    const { detalles, container } = montar();
    detalles.open = true;
    cleanup();

    // Ya no está en el documento; que un Escape posterior no explote
    // ni toque un nodo muerto.
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
    expect(container.querySelector('details')).toBeNull();
  });
});
