import { describe, expect, it } from 'vitest';
import {
  contarGolesAtribuidos,
  descuadreDeGoles,
  textoDelDescuadre,
  type EventoAtribuido,
} from './_sumaDeGoles';

const LOCAL = 'equipo-local';
const VISITANTE = 'equipo-visitante';

const gol = (equipoId: string): EventoAtribuido => ({ equipoId, tipoEvento: 'goal' });
const enContra = (equipoId: string): EventoAtribuido => ({ equipoId, tipoEvento: 'own_goal' });
const amarilla = (equipoId: string): EventoAtribuido => ({ equipoId, tipoEvento: 'yellow_card' });

describe('contarGolesAtribuidos', () => {
  it('cuenta cada gol para su equipo', () => {
    expect(
      contarGolesAtribuidos([gol(LOCAL), gol(LOCAL), gol(VISITANTE)], LOCAL, VISITANTE),
    ).toEqual({ local: 2, visitante: 1 });
  });

  /** La cuenta que se hace mal: el gol en contra es del rival. */
  it('cuenta el gol en contra para el otro equipo', () => {
    expect(contarGolesAtribuidos([enContra(LOCAL)], LOCAL, VISITANTE)).toEqual({
      local: 0,
      visitante: 1,
    });
    expect(contarGolesAtribuidos([enContra(VISITANTE)], LOCAL, VISITANTE)).toEqual({
      local: 1,
      visitante: 0,
    });
  });

  it('las tarjetas no suman goles', () => {
    expect(
      contarGolesAtribuidos(
        [amarilla(LOCAL), { equipoId: LOCAL, tipoEvento: 'red_card' }],
        LOCAL,
        VISITANTE,
      ),
    ).toEqual({ local: 0, visitante: 0 });
  });

  it('ignora a quien no es de ninguno de los dos equipos', () => {
    expect(contarGolesAtribuidos([gol('otro-equipo')], LOCAL, VISITANTE)).toEqual({
      local: 0,
      visitante: 0,
    });
  });
});

describe('descuadreDeGoles', () => {
  it('sin ningún gol cargado no avisa: la planilla es opcional', () => {
    expect(descuadreDeGoles([], LOCAL, VISITANTE, { local: 3, visitante: 0 })).toBeNull();
  });

  /**
   * Una planilla con sólo tarjetas no es una planilla de goles
   * incompleta. Avisar ahí sería pedir goleadores cada vez que se anota
   * una amarilla.
   */
  it('con sólo tarjetas tampoco avisa', () => {
    expect(
      descuadreDeGoles([amarilla(LOCAL)], LOCAL, VISITANTE, { local: 2, visitante: 1 }),
    ).toBeNull();
  });

  it('cuando cuadra, no avisa', () => {
    expect(
      descuadreDeGoles([gol(LOCAL), gol(LOCAL), gol(VISITANTE)], LOCAL, VISITANTE, {
        local: 2,
        visitante: 1,
      }),
    ).toBeNull();
  });

  /** El caso que importa: sin contar bien el gol en contra, esto avisaría de un descuadre inexistente. */
  it('un 1-1 resuelto con un gol en contra cuadra', () => {
    expect(
      descuadreDeGoles([gol(LOCAL), enContra(LOCAL)], LOCAL, VISITANTE, {
        local: 1,
        visitante: 1,
      }),
    ).toBeNull();
  });

  it('cuando faltan goles por atribuir, avisa con las dos cuentas', () => {
    expect(descuadreDeGoles([gol(LOCAL)], LOCAL, VISITANTE, { local: 3, visitante: 0 })).toEqual({
      marcador: { local: 3, visitante: 0 },
      atribuidos: { local: 1, visitante: 0 },
    });
  });

  it('también avisa si sobran', () => {
    expect(
      descuadreDeGoles([gol(LOCAL), gol(LOCAL)], LOCAL, VISITANTE, { local: 1, visitante: 0 }),
    ).not.toBeNull();
  });
});

describe('textoDelDescuadre', () => {
  it('nombra sólo el lado que no cuadra', () => {
    const descuadre = descuadreDeGoles([gol(LOCAL)], LOCAL, VISITANTE, {
      local: 3,
      visitante: 0,
    })!;
    const texto = textoDelDescuadre(descuadre, 'Los Pibes', 'Racing de Barrio');
    expect(texto).toContain('Los Pibes: 3 en el marcador y 1 atribuido');
    expect(texto).not.toContain('Racing de Barrio');
  });

  it('nombra los dos cuando los dos descuadran', () => {
    const descuadre = descuadreDeGoles([], LOCAL, VISITANTE, { local: 2, visitante: 2 });
    expect(descuadre).toBeNull();

    const conGoles = descuadreDeGoles([gol(LOCAL)], LOCAL, VISITANTE, {
      local: 2,
      visitante: 2,
    })!;
    const texto = textoDelDescuadre(conGoles, 'Los Pibes', 'Racing de Barrio');
    expect(texto).toContain('Los Pibes');
    expect(texto).toContain('Racing de Barrio');
  });

  /** Que el aviso diga que no bloquea es la mitad del aviso. */
  it('dice que igual se puede guardar', () => {
    const descuadre = descuadreDeGoles([gol(LOCAL)], LOCAL, VISITANTE, {
      local: 3,
      visitante: 0,
    })!;
    expect(textoDelDescuadre(descuadre, 'A', 'B')).toContain('Podés guardar igual');
  });

  it('singular y plural', () => {
    const uno = descuadreDeGoles([gol(LOCAL)], LOCAL, VISITANTE, { local: 3, visitante: 0 })!;
    expect(textoDelDescuadre(uno, 'A', 'B')).toContain('1 atribuido.');
    const dos = descuadreDeGoles([gol(LOCAL), gol(LOCAL)], LOCAL, VISITANTE, {
      local: 3,
      visitante: 0,
    })!;
    expect(textoDelDescuadre(dos, 'A', 'B')).toContain('2 atribuidos.');
  });
});
