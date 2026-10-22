
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

export type PlayerCondition = Player['condition']

export type PlayersResponse = {
  data: Player[]
  meta: {
    page: number
    limit: number
    total_items: number
    total_pages: number
  }
}

export type CreatePlayerPayload = {
  name: string
  position: Player['position']
  agility: number
  age: number
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
  potential: number
}

export type UpdatePlayerPayload = Pick<
  CreatePlayerPayload,
  'name' | 'position' | 'agility' | 'age'
>

export type BuyPlayerPayload = {
  club_id: number
  loyalty_until: string
}

async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message
    }
    if (Array.isArray(body.message) && body.message.length > 0) {
      return body.message.join(' ')
    }
  } catch {
    // Keep the fallback when the body is not JSON.
  }

  return fallback
}

async function getPlayersPage(page: number, limit?: number): Promise<PlayersResponse> {
  const params = new URLSearchParams({ page: String(page) })
  if (limit !== undefined) params.set('limit', String(limit))

  const response = await fetch(`${API_URL}/players?${params}`)

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Não foi possível carregar os jogadores. Erro HTTP ${response.status}.`,
      ),
    )
  }

  return response.json() as Promise<PlayersResponse>
}

export async function getPlayers(): Promise<Player[]> {
  const firstPage = await getPlayersPage(1)
  const remainingPages = await Promise.all(
    Array.from(
      { length: Math.max(0, firstPage.meta.total_pages - 1) },
      (_, index) => getPlayersPage(index + 2, firstPage.meta.limit),
    ),
  )

  return [firstPage, ...remainingPages].flatMap((page) => page.data)
}

export async function createPlayer(payload: CreatePlayerPayload): Promise<Player> {
  const response = await fetch(`${API_URL}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Não foi possível cadastrar o jogador. Erro HTTP ${response.status}.`,
      ),
    )
  }

  return response.json() as Promise<Player>
}

export async function updatePlayer(id: number, payload: UpdatePlayerPayload): Promise<Player> {
  const response = await fetch(`${API_URL}/players/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Não foi possível editar o jogador. Erro HTTP ${response.status}.`,
      ),
    )
  }

  return response.json() as Promise<Player>
}

export async function updatePlayerCondition(
  id: number,
  condition: PlayerCondition,
): Promise<Player> {
  const response = await fetch(`${API_URL}/players/${id}/condition`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ condition }),
  })

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Não foi possível alterar a condição. Erro HTTP ${response.status}.`,
      ),
    )
  }

  return response.json() as Promise<Player>
}

export async function deletePlayer(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/players/${id}`, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Não foi possível excluir o jogador. Erro HTTP ${response.status}.`,
      ),
    )
  }
}

export async function buyPlayer(id: number, payload: BuyPlayerPayload): Promise<void> {
  const response = await fetch(`${API_URL}/players/${id}/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(
      await readApiError(
        response,
        `Não foi possível comprar o jogador. Erro HTTP ${response.status}.`,
      ),
    )
  }
}
