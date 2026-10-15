// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SelectorOrganizacionActiva } from './SelectorOrganizacionActiva';
import type { OrganizacionListada } from '@/services/organizadores/listarMisOrganizaciones';

// La acción real escribe la cookie y redirige; acá solo interesa que
// cada opción quede atada a su organización.
vi.mock('./_acciones', () => ({
  elegirOrganizacionActiva: Object.assign(vi.fn(), {
    bind: (_: unknown, id: string) => ({ organizacionId: id }),
  }),
}));

afterEach(cleanup);

const ORGANIZACIONES: OrganizacionListada[] = [
  {
    organizacionId: 'o-1',
    nombre: 'Complejo San Martín',
    logoUrl: null,
    rol: 'owner',
    nivelVerificacion: 'basic',
    cantidadTorneos: 3,
  },
  {
    organizacionId: 'o-2',
    nombre: 'Liga del Oeste',
    logoUrl: null,
    rol: 'admin',
    nivelVerificacion: 'unverified',
    cantidadTorneos: 0,
  },
];

function montar() {
  return render(
    <SelectorOrganizacionActiva
      organizaciones={ORGANIZACIONES}
      activaId="o-1"
      nombreActiva="Complejo San Martín"
      logoActiva={null}
    />,
  );
}

describe('SelectorOrganizacionActiva', () => {
  it('el control cerrado dice cuál se está gestionando', () => {
    const { container } = montar();
    expect(container.querySelector('summary')!.textContent).toContain('Complejo San Martín');
  });

  it('la activa se marca y no es un botón: ya está puesta', () => {
    const hoja = montar().container.querySelector('[role="group"]')!;
    const activa = hoja.querySelector('[aria-current="true"]')!;
    expect(activa.textContent).toContain('Complejo San Martín');
    expect(activa.tagName).toBe('SPAN');
  });

  it('las otras son `submit` de la Server Action, así que funcionan sin JavaScript', () => {
    montar();
    const boton = screen.getByRole('button', { name: /liga del oeste/i });
    expect(boton).toHaveAttribute('type', 'submit');
    expect(boton.closest('form')).not.toBeNull();
  });

  it('solo hay un botón: la activa no se puede volver a elegir', () => {
    montar();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
