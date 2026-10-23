import {
  calculateBaseValueCents,
  calculateMarketValueCents,
  calculateOverall,
  formatMoney,
  moneyToCents,
} from './player-calculation';
import type { PlayerAttributes } from './player-calculation';

describe('Player Calculation (RN02 a RN06)', () => {
  describe('Cálculo do valor de mercado (RN02 a RN05)', () => {
    // Tabela oficial do enunciado (Orientações.md linhas 294-306)
    const testCases: Array<{
      baseValue: string;
      condition: 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE';
      agility: number;
      age: number;
      expectedMarketValue: string;
      description: string;
    }> = [
      {
        baseValue: '82.00',
        condition: 'APTO',
        agility: 20,
        age: 25,
        expectedMarketValue: '82.00',
        description: 'APTO, agilidade 20, idade 25 -> 82.00',
      },
      {
        baseValue: '82.00',
        condition: 'APTO',
        agility: 50,
        age: 19,
        expectedMarketValue: '90.20',
        description: 'APTO, idade 19 (+10%) -> 90.20',
      },
      {
        baseValue: '82.00',
        condition: 'MAL_CONDICIONADO',
        agility: 50,
        age: 25,
        expectedMarketValue: '69.70',
        description: 'MAL_CONDICIONADO 15% desc -> 69.70',
      },
      {
        baseValue: '82.00',
        condition: 'MAL_CONDICIONADO',
        agility: 80,
        age: 21,
        expectedMarketValue: '84.05',
        description: 'MAL_CONDICIONADO, agilidade 80 (7.5%), idade 21 (+10%) -> 84.05',
      },
      {
        baseValue: '82.00',
        condition: 'MAL_CONDICIONADO',
        agility: 30,
        age: 33,
        expectedMarketValue: '53.30',
        description: 'MAL_CONDICIONADO, agilidade 30 (25%), idade 33 (-10%) -> 53.30',
      },
      {
        baseValue: '82.00',
        condition: 'DOENTE',
        agility: 90,
        age: 25,
        expectedMarketValue: '69.70',
        description: 'DOENTE, agilidade 90 (15%) -> 69.70',
      },
      {
        baseValue: '82.00',
        condition: 'DOENTE',
        agility: 30,
        age: 25,
        expectedMarketValue: '49.20',
        description: 'DOENTE, agilidade 30 (40% no teto) -> 49.20',
      },
      {
        baseValue: '82.00',
        condition: 'DOENTE',
        agility: 10,
        age: 40,
        expectedMarketValue: '49.20',
        description: 'DOENTE, agilidade 10, idade 40 (-50% limitado ao teto -40%) -> 49.20',
      },
      {
        baseValue: '9.50',
        condition: 'MAL_CONDICIONADO',
        agility: 85,
        age: 25,
        expectedMarketValue: '8.79',
        description: '9.50 com 7.5% desc -> 8.79 (arredondado de 8.7875)',
      },
      {
        baseValue: '1.00',
        condition: 'MAL_CONDICIONADO',
        agility: 50,
        age: 35,
        expectedMarketValue: '1.00',
        description: '1.00 com -25% -> 1.00 (piso mínimo)',
      },
    ];

    testCases.forEach(
      ({ baseValue, condition, agility, age, expectedMarketValue, description }) => {
        it(description, () => {
          const baseCents = moneyToCents(baseValue);
          const marketCents = calculateMarketValueCents(baseCents, condition, agility, age);
          const formatted = formatMoney(marketCents);
          expect(formatted).toBe(expectedMarketValue);
        });
      },
    );
  });

  describe('Cálculo do overall (RN06)', () => {
    it('calcula overall de MEI corretamente (exemplo: 73)', () => {
      const attributes: PlayerAttributes = {
        pace: 68,
        shooting: 65,
        passing: 80,
        dribbling: 78,
        defending: 52,
        physical: 60,
      };
      expect(calculateOverall('MEI', attributes)).toBe(73);
    });

    it('calcula overall de ATA corretamente (exemplo: 76)', () => {
      const attributes: PlayerAttributes = {
        pace: 78,
        shooting: 75,
        passing: 73,
        dribbling: 82,
        defending: 48,
        physical: 68,
      };
      expect(calculateOverall('ATA', attributes)).toBe(76);
    });

    it('calcula overall de LAT corretamente (exemplo: 72)', () => {
      const attributes: PlayerAttributes = {
        pace: 72,
        shooting: 70,
        passing: 78,
        dribbling: 76,
        defending: 70,
        physical: 66,
      };
      expect(calculateOverall('LAT', attributes)).toBe(72);
    });

    it('calcula overall de ZAG arredondando meio para cima (exemplo: 72.5 -> 73)', () => {
      const attributes: PlayerAttributes = {
        pace: 50,
        shooting: 90,
        passing: 60,
        dribbling: 40,
        defending: 80,
        physical: 75,
      };
      expect(calculateOverall('ZAG', attributes)).toBe(73);
    });

    it('calcula overall de GOL corretamente (exemplo: 68)', () => {
      const attributes: PlayerAttributes = {
        pace: 55,
        shooting: 30,
        passing: 65,
        dribbling: 40,
        defending: 72,
        physical: 68,
      };
      expect(calculateOverall('GOL', attributes)).toBe(68);
    });
  });

  describe('Cálculo do valor base (RN06)', () => {
    it('overall 75, potencial 86, 25 anos -> 40.00', () => {
      const cents = calculateBaseValueCents(75, 86, 25);
      expect(formatMoney(cents)).toBe('40.00');
    });

    it('overall 60, potencial 70, 30 anos -> 10.00 (fim 1ª faixa)', () => {
      const cents = calculateBaseValueCents(60, 70, 30);
      expect(formatMoney(cents)).toBe('10.00');
    });

    it('overall 61, potencial 70, 30 anos -> 12.00 (início 2ª faixa)', () => {
      const cents = calculateBaseValueCents(61, 70, 30);
      expect(formatMoney(cents)).toBe('12.00');
    });

    it('overall 76, potencial 80, 22 anos -> 46.00', () => {
      const cents = calculateBaseValueCents(76, 80, 22);
      expect(formatMoney(cents)).toBe('46.00');
    });

    it('overall 85, potencial 92, 27 anos -> 100.00', () => {
      const cents = calculateBaseValueCents(85, 92, 27);
      expect(formatMoney(cents)).toBe('100.00');
    });

    it('overall 70, potencial 84, 21 anos (jovem promessa) -> 34.20', () => {
      const cents = calculateBaseValueCents(70, 84, 21);
      expect(formatMoney(cents)).toBe('34.20');
    });

    it('overall 70, potencial 84, 22 anos -> 30.00', () => {
      const cents = calculateBaseValueCents(70, 84, 22);
      expect(formatMoney(cents)).toBe('30.00');
    });

    it('overall 45, potencial 90, 18 anos -> 3.63 (arredondamento half-up)', () => {
      const cents = calculateBaseValueCents(45, 90, 18);
      expect(formatMoney(cents)).toBe('3.63');
    });

    it('overall 40, potencial 66, 36 anos -> 1.00 (piso mínimo)', () => {
      const cents = calculateBaseValueCents(40, 66, 36);
      expect(formatMoney(cents)).toBe('1.00');
    });
  });
});
