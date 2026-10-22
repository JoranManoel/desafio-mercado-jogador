
const API_URL = import.meta.env.VITE_API_URL

export type Player = {
  id: number
  name: string
  position: 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA'
  agility: number
  age: number
  condition: 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE'
  base_value: number
  market_value: number
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
  potential: number
  overall: number
  club_id: number | null
}

export type PlayersResponse = {
  data: Player[]
  meta: {
    page: number
    limit: number
    total_items: number
    total_pages: number
  }
}

export async function getPlayers(): Promise<PlayersResponse> {
  const response = await fetch(`${API_URL}/players`)

  if (!response.ok) {
    throw new Error(
      `Não foi possível carregar os jogadores. Erro HTTP ${response.status}.`,
    )
  }

  return response.json() as Promise<PlayersResponse>
}
