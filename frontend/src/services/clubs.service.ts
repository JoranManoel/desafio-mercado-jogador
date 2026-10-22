
const API_URL = import.meta.env.VITE_API_URL

export type Club = {
  id: number
  name: string
  acronym: string
  cash: number
  squad_value: number
  net_worth: number
}

export type ClubLineup = {
  players: { id: number }[]
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

export async function getClubLineup(clubId: number): Promise<ClubLineup> {
  const response = await fetch(`${API_URL}/clubs/${clubId}/lineup`)

  if (!response.ok) {
    throw new Error(`Não foi possível consultar a escalação. Erro HTTP ${response.status}.`)
  }

  return response.json() as Promise<ClubLineup>
}
