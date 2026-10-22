export type PlayerPosition = 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA'

export type PlayerAttributes = {
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
}

export type PlayerCondition = 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE'

type AttributeWeights = Record<keyof PlayerAttributes, number>

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
}

export function calculateOverall(
  position: PlayerPosition,
  attributes: PlayerAttributes,
): number {
  const weights = POSITION_WEIGHTS[position]

  const weightedSum =
    attributes.pace * weights.pace +
    attributes.shooting * weights.shooting +
    attributes.passing * weights.passing +
    attributes.dribbling * weights.dribbling +
    attributes.defending * weights.defending +
    attributes.physical * weights.physical

  return Math.floor((weightedSum + 50) / 100)
}

export function calculateBaseValueCents(
  overall: number,
  potential: number,
  age: number,
): number {
  let cents = 0

  cents += Math.max(0, Math.min(overall, 60) - 40) * 50
  cents += Math.max(0, Math.min(overall, 75) - 60) * 200
  cents += Math.max(0, overall - 75) * 600

  if (age <= 21) {
    const factor = 100 + potential - overall
    cents = Math.floor((cents * factor + 50) / 100)
  }

  return Math.max(100, cents)
}

export function calculateMarketValueCents(
  baseValueCents: number,
  condition: PlayerCondition,
  agility: number,
  age: number,
): number {
  let conditionDiscountTenths = 0

  if (condition === 'MAL_CONDICIONADO') {
    conditionDiscountTenths = 150
  } else if (condition === 'DOENTE') {
    conditionDiscountTenths = 300
  }

  if (condition !== 'APTO') {
    if (agility >= 80) {
      conditionDiscountTenths /= 2
    } else if (agility <= 30) {
      conditionDiscountTenths += 100
    }
  }

  let ageAdjustmentTenths = 0

  if (age <= 21) {
    ageAdjustmentTenths = 100
  } else if (age >= 32) {
    ageAdjustmentTenths = -100
  }

  const totalRateTenths = Math.max(
    -400,
    ageAdjustmentTenths - conditionDiscountTenths,
  )
  const factorTenths = 1000 + totalRateTenths
  const roundedCents = Math.floor((baseValueCents * factorTenths + 500) / 1000)

  return Math.max(100, roundedCents)
}

export function formatMoneyFromCents(cents: number): number {
  return Number(`${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`)
}
