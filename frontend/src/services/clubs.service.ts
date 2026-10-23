
const API_URL = import.meta.env.VITE_API_URL

export type Club = {
  id: number
  name: string
  acronym: string
  cash: number
  squad_value: number
  net_worth: number
}

export type CreateClubPayload = {
  name: string
  acronym: string
}

export type ClubLineup = {
  club_id: number
  club_name: string
  formation: ClubFormation | null
  total_players: number
  players: {
    id: number
    name: string
    position: 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA'
    condition: 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE'
  }[]
}

export type ClubRosterContract = {
  purchase_value: number
  loyalty_until: string
  remaining_days: number
  penalty_rate: number
}

export type ClubRosterContracts = {
  players: {
    id: number
    contract: ClubRosterContract | null
  }[]
}

export type ClubFormation = '3-1' | '2-2' | '2-1-1' | '1-2-1'

export type ClubTransaction = {
  id: number
  club_id: number
  player_id: number
  player_name: string
  type: 'COMPRA' | 'VENDA'
  value: number
  fee: number
  penalty: number
  profit: number | null
  cash_change: number
  created_at: string
}

export type MatchSummary = {
  id: number
  home_club_id: number
  home_club_name: string
  away_club_id: number
  away_club_name: string
  home_goals: number
  away_goals: number
  result: 'MANDANTE' | 'VISITANTE' | 'EMPATE'
  home_formation: ClubFormation
  away_formation: ClubFormation
  played_at: string
}

export type MatchDuel = {
  order: number
  attacking_club_id: number
  attacker_id: number
  defender_id: number
  attacker_name: string
  defender_name: string
  attacker_position: 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA'
  defender_position: 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA'
  attacker_condition: 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE'
  defender_condition: 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE'
  attack_attribute: 'shooting' | 'passing' | 'dribbling'
  defense_attribute: 'defending'
  attack_value: number
  defense_value: number
  goal: boolean
}

export type MatchDetails = MatchSummary & {
  duels: MatchDuel[]
}

export type Standing = {
  position: number
  club_id: number
  club_name: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}

export type CreateMatchPayload = {
  home_club_id: number
  away_club_id: number
}

async function getApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    if (typeof body.message === 'string') return body.message
    if (Array.isArray(body.message)) return body.message.join(' ')
  } catch {
    return fallback
  }
  return fallback
}

export async function getClubs(): Promise<Club[]> {
  const response = await fetch(`${API_URL}/clubs`)

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar os clubes. Erro HTTP ${response.status}.`,
    )
  }

  return response.json() as Promise<Club[]>
}

export async function createClub(payload: CreateClubPayload): Promise<Club> {
  const response = await fetch(`${API_URL}/clubs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível cadastrar o clube. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<Club>
}

export async function getClubLineup(clubId: number): Promise<ClubLineup> {
  const response = await fetch(`${API_URL}/clubs/${clubId}/lineup`)

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível consultar a escalação. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<ClubLineup>
}

export async function getClubRosterContracts(clubId: number): Promise<ClubRosterContracts> {
  const response = await fetch(`${API_URL}/clubs/${clubId}`)

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível carregar os contratos do elenco. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<ClubRosterContracts>
}

export async function updateClubLineup(
  clubId: number,
  formation: ClubFormation,
  playerIds: number[],
): Promise<ClubLineup> {
  const response = await fetch(`${API_URL}/clubs/${clubId}/lineup`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formation, player_ids: playerIds }),
  })

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível salvar a escalação. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<ClubLineup>
}

export type TransactionsResponse = {
  data: ClubTransaction[]
  summary: {
    total_spent: number
    total_received: number
    total_fees: number
    total_penalties: number
    total_profit: number
  }
}

export async function getClubTransactions(
  clubId: number,
  type?: string,
  playerId?: number,
): Promise<ClubTransaction[]> {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (playerId !== undefined) params.set('player_id', String(playerId))
  const query = params.size > 0 ? `?${params}` : ''

  const response = await fetch(`${API_URL}/clubs/${clubId}/transactions${query}`)

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível carregar o histórico. Erro HTTP ${response.status}.`))
  }

  const json = (await response.json()) as ClubTransaction[] | TransactionsResponse
  return Array.isArray(json) ? json : json.data
}

export async function downloadClubTransactionsCsv(
  clubId: number,
  type?: string,
  playerId?: number,
): Promise<Blob> {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (playerId !== undefined) params.set('player_id', String(playerId))
  const query = params.size > 0 ? `?${params}` : ''

  const response = await fetch(`${API_URL}/clubs/${clubId}/transactions/export${query}`)

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível exportar o CSV. Erro HTTP ${response.status}.`))
  }

  return response.blob()
}

export async function getMatches(clubId?: number): Promise<MatchSummary[]> {
  const params = new URLSearchParams()
  if (clubId !== undefined) params.set('club_id', String(clubId))
  const query = params.size > 0 ? `?${params}` : ''
  const response = await fetch(`${API_URL}/matches${query}`)

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível carregar as partidas. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<MatchSummary[]>
}

export async function getMatch(id: number): Promise<MatchDetails> {
  const response = await fetch(`${API_URL}/matches/${id}`)

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível carregar a partida. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<MatchDetails>
}

export async function createMatch(payload: CreateMatchPayload): Promise<MatchDetails> {
  const response = await fetch(`${API_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível jogar a partida. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<MatchDetails>
}

export async function getStandings(): Promise<Standing[]> {
  const response = await fetch(`${API_URL}/standings`)

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível carregar a classificação. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<Standing[]>
}
