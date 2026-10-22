import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { getPlayers, type Player as ApiPlayer } from './services/players.service'
import {
  Activity,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Eye,
  HeartPulse,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShoppingCart,
  Tag,
  TriangleAlert,
  Trophy,
  Trash2,
  TrendingUp,
  User,
  Users,
  Shirt,
  X,
  PanelLeft,
  ArrowUpDown,
  Swords,
  ListOrdered,
  SearchX,
  ServerOff,
} from 'lucide-react'
import './App.css'
import { getClubLineup, getClubs, type Club } from './services/clubs.service'
import {
  buyPlayer,
  deletePlayer,
  updatePlayer,
  updatePlayerCondition,
  type PlayerCondition,
} from './services/players.service'
import HomeScreen from './components/HomeScreen'
import NewPlayerScreen from './components/NewPlayerScreen'


type Player = {
  id: number
  name: string
  position: ApiPlayer['position']
  positionName: string
  overall: number
  agility: number
  age: number
  condition: 'Apto' | 'Mal condicionado' | 'Doente'
  apiCondition: ApiPlayer['condition']
  baseValue: number
  marketValue: number
  club: string | null
  clubId: number | null
  acronym: string | null
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
  potential: number
}

type PlayerAction = 'details' | 'edit' | 'condition' | 'buy' | 'delete'

const POSITION_OPTIONS: { value: Player['position']; label: string }[] = [
  { value: 'GOL', label: 'Goleiro' },
  { value: 'ZAG', label: 'Zagueiro' },
  { value: 'LAT', label: 'Lateral' },
  { value: 'MEI', label: 'Meio-campo' },
  { value: 'ATA', label: 'Atacante' },
]

const positionNames: Record<Player['position'], string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LAT: 'Lateral',
  MEI: 'Meio-campo',
  ATA: 'Atacante',
}


function mapApiPlayer(player: ApiPlayer, clubs: Club[]): Player {
  const conditionNames: Record<ApiPlayer['condition'], Player['condition']> = {
    APTO: 'Apto',
    MAL_CONDICIONADO: 'Mal condicionado',
    DOENTE: 'Doente',
  }

  const playerClub = clubs.find((club) => club.id === player.club_id)

  return {
    id: player.id,
    name: player.name,
    position: player.position,
    positionName: positionNames[player.position],
    overall: player.overall,
    agility: player.agility,
    age: player.age,
    condition: conditionNames[player.condition],
    apiCondition: player.condition,
    baseValue: player.base_value,
    marketValue: player.market_value,
    club: playerClub?.name ?? null,
    clubId: player.club_id,
    acronym: playerClub?.acronym ?? null,
    pace: player.pace,
    shooting: player.shooting,
    passing: player.passing,
    dribbling: player.dribbling,
    defending: player.defending,
    physical: player.physical,
    potential: player.potential,
  }
}

const money = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function App() {

  const [players, setPlayers] = useState<Player[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  async function loadPlayers() {
    setLoading(true)
    setError(null)

    try {
      const [playersResponse, clubsResponse] = await Promise.all([
        getPlayers(),
        getClubs(),
      ])

      setClubs(clubsResponse)
      setPlayers(
        playersResponse.map((player) =>
          mapApiPlayer(player, clubsResponse),
        ),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os dados.',
      )
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    void loadPlayers()
  }, [])

  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [condition, setCondition] = useState('')
  const [club, setClub] = useState('')
  const [age, setAge] = useState('')
  const [valueRange, setValueRange] = useState('')
  const [tab, setTab] = useState<'Todos' | 'Livres' | 'Em clubes'>('Todos')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)
  const [actionDialog, setActionDialog] = useState<{
    action: PlayerAction
    player: Player
  } | null>(null)
  const [activeSection, setActiveSection] = useState('Início')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const filteredPlayers = useMemo(() => {
    let result = players.filter((player) =>
      player.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')),
    )

    if (position) result = result.filter((player) => player.position === position)
    if (condition) result = result.filter((player) => player.condition === condition)
    if (club) result = result.filter((player) => player.club === club)
    if (age === 'jovens') result = result.filter((player) => player.age <= 21)
    if (age === 'veteranos') result = result.filter((player) => player.age >= 32)
    if (valueRange === 'ate30') result = result.filter((player) => player.marketValue <= 30)
    if (valueRange === 'acima50') result = result.filter((player) => player.marketValue > 50)
    if (tab === 'Livres') result = result.filter((player) => !player.club)
    if (tab === 'Em clubes') result = result.filter((player) => !!player.club)

    result.sort((a, b) => {
      if (sort === 'value') return b.marketValue - a.marketValue || a.name.localeCompare(b.name, 'pt-BR')
      if (sort === 'overall') return b.overall - a.overall || a.name.localeCompare(b.name, 'pt-BR')
      return a.name.localeCompare(b.name, 'pt-BR')
    })

    return result
  }, [players, search, position, condition, club, age, valueRange, tab, sort])


  const clubOptions = [
    ...new Set(players.map((player) => player.club).filter(
      (club): club is string => club !== null,
    )),
  ].sort()

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / pageSize))
  const visiblePlayers = filteredPlayers.slice((page - 1) * pageSize, page * pageSize)

  function changeSection(section: string) {
    setActiveSection(section)
  }

  if (activeSection === 'Início') {
  return (
    <HomeScreen
      totalPlayers={players.length}
      freePlayers={players.filter((player) => !player.club).length}
      totalClubs={clubs.length}
      totalMatches={0}
      onStart={() => setActiveSection('Jogadores')}
    />
  )
}

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <aside className="sidebar">
          <button className="brand" onClick={() => changeSection('Jogadores')}>
            <span className="brand-mark">P</span>
            <span>
              <strong>Passe</strong>
              <small>Gestão da liga</small>
            </span>
          </button>

          <div className="nav-label">Mercado</div>
          <nav className="nav-list">
            <button className={activeSection === 'Jogadores' || activeSection === 'Novo jogador' ? 'nav-item active' : 'nav-item'} onClick={() => changeSection('Jogadores')}>
              <Users size={16} /> <span>Jogadores</span><small>{filteredPlayers.length}</small>
            </button>
            <button className={activeSection === 'Clubes' ? 'nav-item active' : 'nav-item'} onClick={() => changeSection('Clubes')}>
              <Shield size={16} /> <span>Clubes</span><small>{clubs.length}</small>
            </button>
          </nav>

          <div className="nav-label">Liga</div>
          <nav className="nav-list">
            <button className={activeSection === 'Partidas' ? 'nav-item active' : 'nav-item'} onClick={() => changeSection('Partidas')}>
              <Swords size={16} /><span>Partidas</span><small>2</small>
            </button>
            <button className={activeSection === 'Classificação' ? 'nav-item active' : 'nav-item'} onClick={() => changeSection('Classificação')}>
              <ListOrdered size={16} /><span>Classificação</span>
            </button>
          </nav>

          <div className="clubs-heading">
            <span>Clubes</span>
            <button aria-label="Adicionar clube" onClick={() => changeSection('Clubes')}><Plus size={16} /></button>
          </div>
          <nav className="club-list">
            {clubs.map((club) => (
              <button
                key={club.id}
                onClick={() => changeSection(club.name)}
                className="club-item"
              >
                <span className="club-avatar">{club.acronym}</span>
                {club.name}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="league-card">
              <Trophy size={16} />
              <div><strong>Liga Fictícia 2026</strong><small>6 clubes · 23 jogadores</small></div>
            </div>
            <div className="league-card">
              <Activity size={16} />
              <div><strong>Última partida</strong><small>Delta FC 2 × 1 Águias FC</small></div>
            </div>
            <div className="league-card">
              <Clock3 size={16} />
              <div><strong>Horário de Brasília (UTC−3)</strong></div>
            </div>
          </div>
        </aside>
      )}

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs">
            <button className="icon-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Alternar menu">
              {sidebarOpen ? <PanelLeft size={17} /> : <X size={17} />}
            </button>
            <span>Mercado</span>
            <ChevronRight size={14} />
            <strong>{activeSection === 'Novo jogador' ? 'Jogadores' : activeSection}</strong>
          </div>
          <button
            className="icon-button"
            aria-label="Atualizar lista"
            onClick={() => {
              setPage(1)
              void loadPlayers()
            }}
          ><RefreshCw size={15} /></button>
        </header>

        <div className="page-content">
          {activeSection === 'Jogadores' || activeSection === 'Novo jogador' ? (
            <>
              <div className="page-heading">
                <div className="heading-icon"><Users size={22} /></div>
                <div className="heading-copy">
                  <h1>Jogadores</h1>
                  <p>Cadastre jogadores, acompanhe os indicadores e compre os que estão livres.</p>
                </div>
                <button className="primary-button" onClick={() => changeSection('Novo jogador')}>
                  <Plus size={16} /> Novo jogador
                </button>
              </div>

              <section className="filters-card">
                <label className="search-field">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                    placeholder="Buscar por nome"
                  />
                  {search && <button aria-label="Limpar busca" onClick={() => setSearch('')}><X size={14} /></button>}
                </label>

                <label className="select-field">
                  <Shirt size={14} />
                  <select value={position} onChange={(event) => { setPosition(event.target.value); setPage(1) }}>
                    <option value="">Posição</option>
                    {['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'].map((item) => <option key={item} value={item}>{item}</option>)}
                  </select><ChevronDown size={13} />
                </label>

                <label className="select-field">
                  <HeartPulse size={14} />
                  <select value={condition} onChange={(event) => { setCondition(event.target.value); setPage(1) }}>
                    <option value="">Condição</option>
                    <option value="Apto">Apto</option>
                    <option value="Mal condicionado">Mal condicionado</option>
                    <option value="Doente">Doente</option>
                  </select><ChevronDown size={13} />
                </label>

                <label className="select-field">
                  <Shield size={14} />
                  <select value={club} onChange={(event) => { setClub(event.target.value); setPage(1) }}>
                    <option value="">Clube</option>
                    {clubOptions.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select><ChevronDown size={13} />
                </label>

                <label className="select-field">
                  <User size={14} />
                  <select value={age} onChange={(event) => { setAge(event.target.value); setPage(1) }}>
                    <option value="">Idade</option>
                    <option value="jovens">Até 21 anos</option>
                    <option value="veteranos">32 anos ou mais</option>
                  </select><ChevronDown size={13} />
                </label>

                <label className="select-field">
                  <Coins size={14} />
                  <select value={valueRange} onChange={(event) => { setValueRange(event.target.value); setPage(1) }}>
                    <option value="">Valor de mercado</option>
                    <option value="ate30">Até 30 moedas</option>
                    <option value="acima50">Acima de 50 moedas</option>
                  </select><ChevronDown size={13} />
                </label>
              </section>
              {(search || position || condition || club || age || valueRange) && (
                <section className="active-filters">
                  <p>Filtros ativos:</p>
                  <div className="active-filters-list">
                    {search && <span className="filter-pill">Busca: {search} <button aria-label="Remover filtro" onClick={() => setSearch('')}><X size={12} /></button></span>}
                    {position && <span className="filter-pill">Posição: {position} <button aria-label="Remover filtro" onClick={() => setPosition('')}><X size={12} /></button></span>}
                    {condition && <span className="filter-pill">Condição: {condition} <button aria-label="Remover filtro" onClick={() => setCondition('')}><X size={12} /></button></span>}
                    {club && <span className="filter-pill">Clube: {club} <button aria-label="Remover filtro" onClick={() => setClub('')}><X size={12} /></button></span>}
                    {age && <span className="filter-pill">Idade: {age === 'jovens' ? 'Até 21 anos' : '32 anos ou mais'} <button aria-label="Remover filtro" onClick={() => setAge('')}><X size={12} /></button></span>}
                    {valueRange && <span className="filter-pill">Valor de mercado: {valueRange === 'ate30' ? 'Até 30 moedas' : 'Acima de 50 moedas'} <button aria-label="Remover filtro" onClick={() => setValueRange('')}><X size={12} /></button></span>}
                  </div>
                  <button aria-label="Limpar filtros" className="clear-filters" onClick={() => {
                    setSearch('');
                    setPosition('');
                    setCondition('');
                    setClub('');
                    setAge('');
                    setValueRange('');
                  }}>
                    Limpar filtros
                  </button>
                </section>
              )}
              <section className="table-card">
                <div className="table-toolbar">
                  <div className="tabs">
                    {(['Todos', 'Livres', 'Em clubes'] as const).map((item) => {
                      const count = item === 'Todos' ? players.length : item === 'Livres' ? players.filter((player) => !player.club).length : players.filter((player) => player.club).length
                      return (
                        <button key={item} className={tab === item ? 'tab active' : 'tab'} onClick={() => { setTab(item); setPage(1) }}>
                          {item} <span>{count}</span>
                        </button>
                      )
                    })}
                  </div>
                  <label className="sort-select">
                    <ArrowUpDown size={14} />
                    <span>Ordenar:</span>
                    <select value={sort} onChange={(event) => setSort(event.target.value)}>
                      <option value="name">nome</option>
                      <option value="value">valor de mercado</option>
                      <option value="overall">overall</option>
                    </select><ChevronDown size={13} />
                  </label>
                </div>

                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Jogador</th><th>Posição</th><th>Overall</th><th>Agilidade</th><th>Idade</th><th>Condição</th><th>Valor base</th><th>Valor de mercado</th><th>Clube</th><th aria-label="Ações"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={10} className="empty-state">
                            Carregando jogadores...
                          </td>
                        </tr>
                      )}

                      {!loading && error && (
                        <tr>
                          <td colSpan={10} className="empty-state">
                            <ServerOff size={22} />
                            <strong>Não foi possível carregar os jogadores</strong>
                            <span style={{ margin: '10px 0' }}>{error}</span>
                            <button className="secondary-button" onClick={() => void loadPlayers()}>
                              <RefreshCw size={14} />
                              Tentar de novo
                            </button>
                          </td>
                        </tr>
                      )}
                      {!loading && !error && visiblePlayers.map((player) => (
                        <tr key={player.id}>
                          <td>
                            <div className="player-cell">
                              <span className={`player-avatar avatar-${player.id % 6}`}>{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                              <div><strong>{player.name}</strong><small>{player.positionName}</small></div>
                            </div>
                          </td>
                          <td><span className="position-pill">{player.position}</span></td>
                          <td className="numeric strong">{player.overall}</td>
                          <td>
                            <div className="agility-cell"><span>{player.agility}</span><span className={`agility-bar agility-${player.agility >= 80 ? 'high' : player.agility <= 30 ? 'low' : 'medium'}`}><i style={{ width: `${player.agility}%` }} /></span></div>
                          </td>
                          <td className="numeric">{player.age}</td>
                          <td><span className={`condition condition-${player.condition === 'Apto' ? 'fit' : player.condition === 'Doente' ? 'sick' : 'poor'}`}><i />{player.condition}</span></td>
                          <td className="numeric muted">{money(player.baseValue)}</td>
                          <td className="numeric strong">{money(player.marketValue)}</td>
                          <td>
                            {player.club ? <a className="club-link" href="#club" onClick={(event) => { event.preventDefault(); changeSection(player.club!) }}><span>{player.acronym}</span>{player.club}</a> : <span className="free-badge">Livre</span>}
                          </td>
                          <td>
                            <PlayerActions
                              player={player}
                              canBuy={!player.club}
                              canDelete={!player.club}
                              onSelect={(action) => setActionDialog({ action, player })}
                            />
                          </td>
                        </tr>
                      ))}
                      {!loading && !error && visiblePlayers.length === 0 && <tr><td colSpan={10} className="empty-state"><SearchX size={22} /><strong>Nenhum jogador encontrado para "{search || 'a busca'}"</strong><span>Tente alterar os filtros ou a busca.</span></td></tr>}
                    </tbody>
                  </table>
                </div>

                <footer className="table-footer">
                  <span>Mostrando {filteredPlayers.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredPlayers.length)} de {filteredPlayers.length} jogadores</span>
                  <div className="pagination">
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={15} /> Anterior</button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                      <button key={number} className={page === number ? 'current' : ''} onClick={() => setPage(number)}>{number}</button>
                    ))}
                    <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima <ChevronRight size={15} /></button>
                  </div>
                </footer>
              </section>
              <p className="page-note">Overall e valor de mercado são calculados a cada consulta. A busca ignora maiúsculas, minúsculas e acentos.</p>
            </>
          ) : (
            <section className="placeholder-page">
              <div className="heading-icon"><Shield size={22} /></div>
              <h1>{activeSection}</h1>
              <p>Esta área será implementada nas próximas etapas, seguindo o layout do SENAI.</p>
              <button className="secondary-button" onClick={() => changeSection('Jogadores')}>Voltar para Jogadores</button>
            </section>
          )}
        </div>
        {activeSection === 'Novo jogador' && (
          <NewPlayerScreen
            onCancel={() => changeSection('Jogadores')}
            onCreated={async () => {
              await loadPlayers()
            }}
            onViewDetails={(createdPlayer) => {
              setActionDialog({ action: 'details', player: mapApiPlayer(createdPlayer, clubs) })
              changeSection('Jogadores')
            }}
          />
        )}
        {actionDialog && (
          <PlayerActionDialog
            key={`${actionDialog.action}-${actionDialog.player.id}`}
            action={actionDialog.action}
            player={actionDialog.player}
            clubs={clubs}
            onClose={() => setActionDialog(null)}
            onSelectAction={(action) => setActionDialog({ action, player: actionDialog.player })}
            onComplete={async () => {
              setActionDialog(null)
              setPage(1)
              await loadPlayers()
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App

type PlayerActionsProps = {
  player: Player
  canBuy: boolean
  canDelete: boolean
  onSelect: (action: PlayerAction) => void
}

function PlayerActions({ player, canBuy, canDelete, onSelect }: PlayerActionsProps) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function dismiss(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function toggleMenu() {
    if (open) {
      setOpen(false)
      return
    }

    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const width = 184
    const height = 220
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))
    const below = rect.bottom + 4
    const top = below + height <= window.innerHeight - 8
      ? below
      : Math.max(8, rect.top - height - 4)

    setMenuPosition({ top, left })
    setOpen(true)
  }

  function select(action: PlayerAction) {
    setOpen(false)
    onSelect(action)
  }

  return (
    <div className="row-actions">
      {!player.club && (
        <button className="buy-button" onClick={() => select('buy')}>
          <ShoppingCart size={13} /> Comprar
        </button>
      )}
      <button
        ref={triggerRef}
        className="icon-button tiny"
        aria-label={`Mais ações para ${player.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleMenu}
      >
        <MoreHorizontal size={17} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="player-actions-menu"
          role="menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <div className="player-actions-heading">{player.name}</div>
          <button role="menuitem" onClick={() => select('details')}><Eye size={14} />Ver detalhes</button>
          <button role="menuitem" onClick={() => select('edit')}><Pencil size={14} />Editar</button>
          <button role="menuitem" onClick={() => select('condition')}><HeartPulse size={14} />Alterar condição</button>
          <div className="player-actions-divider" />
          <button role="menuitem" disabled={!canBuy} onClick={() => select('buy')}><ShoppingCart size={14} />Comprar</button>
          <button className="player-action-danger" role="menuitem" disabled={!canDelete} onClick={() => select('delete')}><Trash2 size={14} />Excluir</button>
          {!canDelete && <p>Disponível apenas para jogador livre.</p>}
        </div>,
        document.body,
      )}
    </div>
  )
}

type PlayerActionDialogProps = {
  action: PlayerAction
  player: Player
  clubs: Club[]
  onClose: () => void
  onSelectAction: (action: PlayerAction) => void
  onComplete: () => Promise<void>
}

const CONDITION_OPTIONS: { value: PlayerCondition; label: string; description: string }[] = [
  { value: 'APTO', label: 'Apto', description: 'Sem desconto por condição.' },
  { value: 'MAL_CONDICIONADO', label: 'Mal condicionado', description: 'Desconto de 15%. Agilidade de 80 a 100 corta pela metade; de 1 a 30 soma 10 pontos.' },
  { value: 'DOENTE', label: 'Doente', description: 'Desconto de 30%, com o mesmo ajuste de agilidade.' },
]

function defaultLoyaltyDate() {
  const date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

function PlayerActionDialog({ action, player, clubs, onClose, onSelectAction, onComplete }: PlayerActionDialogProps) {
  const [name, setName] = useState(player.name)
  const [position, setPosition] = useState<Player['position']>(player.position)
  const [age, setAge] = useState(player.age)
  const [agility, setAgility] = useState(player.agility)
  const [condition, setCondition] = useState<PlayerCondition>(player.apiCondition)
  const [clubId, setClubId] = useState(clubs[0]?.id.toString() ?? '')
  const [loyaltyUntil, setLoyaltyUntil] = useState(defaultLoyaltyDate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lineupStatus, setLineupStatus] = useState<boolean | 'error' | null>(null)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  useEffect(() => {
    if (action !== 'condition' || !player.clubId) return

    let active = true
    void getClubLineup(player.clubId)
      .then((lineup) => {
        if (active) setLineupStatus(lineup.players.some((entry) => entry.id === player.id))
      })
      .catch(() => {
        if (active) setLineupStatus('error')
      })

    return () => {
      active = false
    }
  }, [action, player.clubId, player.id])

  const titles: Record<PlayerAction, string> = {
    details: 'Detalhes do jogador',
    edit: 'Editar jogador',
    condition: 'Alterar condição física',
    buy: 'Comprar jogador',
    delete: 'Excluir jogador',
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (action === 'edit') {
        await updatePlayer(player.id, { name, position, age, agility })
      } else if (action === 'condition') {
        await updatePlayerCondition(player.id, condition)
      } else if (action === 'buy') {
        if (!clubId) throw new Error('Selecione um clube para continuar.')
        await buyPlayer(player.id, {
          club_id: Number(clubId),
          loyalty_until: `${loyaltyUntil}-03:00`,
        })
      } else if (action === 'delete') {
        await deletePlayer(player.id)
      }

      await onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className={`player-dialog-backdrop ${action === 'details' ? 'player-details-backdrop' : ''}`} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className={`player-action-dialog ${action === 'details' ? 'player-details-drawer' : ''} ${action === 'condition' ? 'player-condition-dialog' : ''}`} role="dialog" aria-modal="true" aria-labelledby="player-action-title">
        {action === 'details' ? (
          <header className="player-details-heading">
            <span className="player-details-avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
            <div className="player-details-name">
              <h2 id="player-action-title">{player.name}</h2>
              <div>
                <span className="position-pill">{player.position}</span>
                <span className={`condition condition-${player.condition === 'Apto' ? 'fit' : player.condition === 'Doente' ? 'sick' : 'poor'}`}><i />{player.condition}</span>
                <span className="free-badge">{player.club ?? 'Livre'}</span>
              </div>
            </div>
            <button className="icon-button tiny" type="button" aria-label="Fechar" onClick={onClose} disabled={saving}><X size={16} /></button>
          </header>
        ) : (
          <header>
            <div>
              <h2 id="player-action-title">{titles[action]}</h2>
              <p>{action === 'condition' ? 'A condição muda o desconto do valor de mercado, recalculado ao salvar.' : player.name}</p>
            </div>
            <button className="icon-button tiny" type="button" aria-label="Fechar" onClick={onClose} disabled={saving}><X size={16} /></button>
          </header>
        )}

        {action === 'details' ? (
          <div className="player-detail-content">
            <div className="player-detail-cards">
              <article><span>Valor de mercado <Coins size={12} /></span><strong>{money(player.marketValue)}</strong><small>Calculado automaticamente</small></article>
              <article><span>Valor base <Tag size={12} /></span><strong>{money(player.baseValue)}</strong><small>Calculado no cadastro</small></article>
              <article><span>Overall <Activity size={12} /></span><strong>{player.overall}</strong><small>Calculado pela posição</small></article>
              <article><span>Potencial <TrendingUp size={12} /></span><strong>{player.potential}</strong><small>Informado no cadastro</small></article>
            </div>

            <section className="player-detail-tech">
              <header><h3>Indicadores técnicos</h3><small>Escala de 1 a 99</small></header>
              <div className="player-detail-bars">
                {[
                  ['Velocidade', player.pace],
                  ['Finalização', player.shooting],
                  ['Passe', player.passing],
                  ['Drible', player.dribbling],
                  ['Defesa', player.defending],
                  ['Físico', player.physical],
                ].map(([label, value]) => (
                  <div className="player-detail-bar-row" key={label}>
                    <span>{label}</span>
                    <div className="player-detail-bar"><i style={{ width: `${player.potential}%` }} /><b style={{ width: `${value}%` }} /></div>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="player-detail-legend"><span><i />Valor do atributo</span><span><i />Até o potencial ({player.potential}), que nenhum atributo passa</span></div>
            </section>

            <dl className="player-detail-facts">
              <div><dt>Idade</dt><dd>{player.age} anos</dd></div>
              <div><dt>Agilidade</dt><dd>{player.agility}</dd></div>
              <div><dt>Clube</dt><dd>{player.club ?? 'Livre'}</dd></div>
            </dl>

            <footer className="player-details-footer">
              <button className="secondary-button" type="button" onClick={() => onSelectAction('edit')}><Pencil size={13} />Editar</button>
              <button className="secondary-button" type="button" onClick={() => onSelectAction('condition')}><HeartPulse size={13} />Alterar condição</button>
              {!player.club && <button className="primary-button" type="button" onClick={() => onSelectAction('buy')}><ShoppingCart size={13} />Comprar</button>}
            </footer>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {action === 'condition' && (
              <div className="player-condition-form">
                <div className="player-condition-summary">
                  <span className="player-details-avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <div><strong>{player.name}</strong><small>{player.position} · {player.positionName} · {player.age} anos</small></div>
                  <span className={`condition condition-${player.condition === 'Apto' ? 'fit' : player.condition === 'Doente' ? 'sick' : 'poor'}`}><i />{player.condition}</span>
                </div>

                <div className="player-condition-options" role="radiogroup" aria-label="Condição física">
                  {CONDITION_OPTIONS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={condition === item.value}
                      className={condition === item.value ? 'selected' : ''}
                      disabled={player.apiCondition === 'DOENTE' && item.value === 'APTO'}
                      onClick={() => setCondition(item.value)}
                    >
                      <span className="player-condition-radio"><i /></span>
                      <span className="player-condition-option-copy">
                        <strong>{item.label}</strong>
                        {item.value === player.apiCondition && <small className="player-condition-current">Atual</small>}
                        <small>{item.description}</small>
                      </span>
                    </button>
                  ))}
                </div>

                {condition === 'DOENTE' && player.clubId && lineupStatus === null && <p className="player-lineup-check">Verificando escalação do clube...</p>}
                {condition === 'DOENTE' && lineupStatus === true && (
                  <div className="player-condition-warning">
                    <TriangleAlert size={15} />
                    <p><strong>{player.name} é titular</strong><span>Ao passar para Doente, ele sai da escalação. O {player.club} só volta a jogar partidas depois de escalar novos 5 titulares.</span></p>
                  </div>
                )}
                {condition === 'DOENTE' && lineupStatus === 'error' && <p className="player-lineup-check">Não foi possível verificar se o jogador está na escalação.</p>}
              </div>
            )}
            {action === 'edit' && (
              <div className="player-action-fields">
                <label>Nome<input required minLength={3} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
                <label className="player-edit-position np-field">
                  <span>Posição</span>
                  <div className="np-positions" role="radiogroup" aria-label="Posição">
                    {POSITION_OPTIONS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        role="radio"
                        aria-checked={position === item.value}
                        aria-label={`${item.value} ${item.label}`}
                        className={position === item.value ? 'active' : ''}
                        disabled={Boolean(player.club)}
                        onClick={() => setPosition(item.value)}
                      >
                        <strong>{item.value}</strong>
                        <small>{item.label}</small>
                      </button>
                    ))}
                  </div>
                </label>
                <div className="player-action-field-row">
                  <label>Idade<input type="number" min={player.age} max={45} value={age} onChange={(event) => setAge(Number(event.target.value))} /></label>
                  <label>Agilidade<input type="number" min={1} max={age >= 35 ? 85 : 100} value={agility} onChange={(event) => setAgility(Number(event.target.value))} /></label>
                </div>
                {player.club && <small>A posição não pode ser alterada enquanto o jogador pertence a um clube.</small>}
              </div>
            )}
            {action === 'buy' && (
              <div className="player-action-fields">
                <label>Clube<select required value={clubId} onChange={(event) => setClubId(event.target.value)}>
                  <option value="">Selecione um clube</option>
                  {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                </select></label>
                <label><span><CalendarClock size={13} /> Fim da fidelidade</span><input required type="datetime-local" value={loyaltyUntil} onChange={(event) => setLoyaltyUntil(event.target.value)} /></label>
                {clubs.length === 0 && <small>Nenhum clube disponível para a compra.</small>}
              </div>
            )}
            {action === 'delete' && <p className="player-delete-copy">Tem certeza de que deseja excluir <strong>{player.name}</strong>? Esta ação remove o jogador do mercado.</p>}
            {error && <p className="player-action-error" role="alert">{error}</p>}
            <footer>
              <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
              <button className={action === 'delete' ? 'player-confirm-danger' : 'primary-button'} type="submit" disabled={saving || (action === 'buy' && clubs.length === 0)}>
                {saving ? 'Salvando...' : action === 'delete' ? 'Excluir jogador' : action === 'buy' ? 'Confirmar compra' : action === 'condition' ? 'Salvar condição' : 'Salvar alterações'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>,
    document.body,
  )
}