export type PlayerPosition = 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA';

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

type AttributeWeights = Record<keyof PlayerAttributes, number>;

const POSITION_WEIGHTS: Record<PlayerPosition, AttributeWeights> = {
  GOL: {
    pace: 10,
    shooting: 0,
    passing: 20,
    dribbling: 0,
    defending: 40,
    physical: 30,
  },
  ZAG: {
    pace: 10,
    shooting: 0,
    passing: 15,
    dribbling: 0,
    defending: 45,
    physical: 30,
  },
  LAT: {
    pace: 25,
    shooting: 0,
    passing: 20,
    dribbling: 15,
    defending: 25,
    physical: 15,
  },
  MEI: {
    pace: 10,
    shooting: 15,
    passing: 35,
    dribbling: 25,
    defending: 5,
    physical: 10,
  },
  ATA: {
    pace: 20,
    shooting: 40,
    passing: 10,
    dribbling: 20,
    defending: 0,
    physical: 10,
  },
};

/**
 * Calcula o overall e arredonda para o inteiro mais próximo.
 * Empates são arredondados para cima.
 */
export function calculateOverall(
  position: PlayerPosition,
  attributes: PlayerAttributes,
): number {
  const weights = POSITION_WEIGHTS[position];

  const weightedSum =
    attributes.pace * weights.pace +
    attributes.shooting * weights.shooting +
    attributes.passing * weights.passing +
    attributes.dribbling * weights.dribbling +
    attributes.defending * weights.defending +
    attributes.physical * weights.physical;

  return Math.floor((weightedSum + 50) / 100);
}

/**
 * Calcula o valor base em centavos inteiros.
 * A progressão considera as faixas do enunciado.
 */
export function calculateBaseValueCents(
  overall: number,
  potential: number,
  age: number,
): number {
  let cents = 0;

  // Faixa 41–60: 0,50 moeda por ponto.
  cents += Math.max(0, Math.min(overall, 60) - 40) * 50;

  // Faixa 61–75: 2,00 moedas por ponto.
  cents += Math.max(0, Math.min(overall, 75) - 60) * 200;

  // Faixa 76–99: 6,00 moedas por ponto.
  cents += Math.max(0, overall - 75) * 600;

  // Jovem promessa: bônus baseado na diferença potencial - overall.
  if (age <= 21) {
    const factor = 100 + potential - overall;

    // Arredondamento monetário half-up, em centavos inteiros.
    cents = Math.floor((cents * factor + 50) / 100);
  }

  // Valor base mínimo de 1,00 moeda.
  return Math.max(100, cents);
}

/**
 * Formata centavos inteiros como uma string decimal exata.
 * Evita usar ponto flutuante para armazenar dinheiro.
 */
export function formatMoney(cents: number): string {
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');

  return `${whole}.${fraction}`;
}

export type PlayerCondition =
  | 'APTO'
  | 'MAL_CONDICIONADO'
  | 'DOENTE';

/**
 * Converte um valor decimal com duas casas para centavos inteiros.
 * Exemplo: "40.05" -> 4005.
 */
export function moneyToCents(value: string): number {
  const [wholePart, fractionPart = ''] = value.split('.');

  const whole = Number(wholePart);
  const fraction = Number(
    fractionPart.padEnd(2, '0').slice(0, 2),
  );

  return whole * 100 + fraction;
}

/**
 * Calcula o valor de mercado em centavos.
 * O resultado respeita o arredondamento monetário half-up
 * e o valor mínimo de 1,00 moeda.
 */
export function calculateMarketValueCents(
  baseValueCents: number,
  condition: PlayerCondition,
  agility: number,
  age: number,
): number {
  let conditionDiscountTenths = 0;

  if (condition === 'MAL_CONDICIONADO') {
    conditionDiscountTenths = 150;
  } else if (condition === 'DOENTE') {
    conditionDiscountTenths = 300;
  }

  if (condition !== 'APTO') {
    if (agility >= 80) {
      conditionDiscountTenths /= 2;
    } else if (agility <= 30) {
      conditionDiscountTenths += 100;
    }
  }

  let ageAdjustmentTenths = 0;

  if (age <= 21) {
    ageAdjustmentTenths = 100;
  } else if (age >= 32) {
    ageAdjustmentTenths = -100;
  }

  const totalRateTenths = Math.max(
    -400,
    ageAdjustmentTenths - conditionDiscountTenths,
  );

  // 1000 representa 100%; cada unidade representa 0,1%.
  const factorTenths = 1000 + totalRateTenths;

  const roundedCents = Math.floor(
    (baseValueCents * factorTenths + 500) / 1000,
  );

  return Math.max(100, roundedCents);
}