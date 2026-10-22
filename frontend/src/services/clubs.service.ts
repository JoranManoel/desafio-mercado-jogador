
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

export async function getClubTransactions(clubId: number): Promise<ClubTransaction[]> {
  const response = await fetch(`${API_URL}/clubs/${clubId}/transactions`)

  if (!response.ok) {
    throw new Error(await getApiError(response, `Não foi possível carregar o histórico. Erro HTTP ${response.status}.`))
  }

  return response.json() as Promise<ClubTransaction[]>
}
