import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { getPlayers, type Player as ApiPlayer } from './services/players.service'
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Eye,
  HeartPulse,
  Info,
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
  ChartColumn,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  HandCoins,
  History,
} from 'lucide-react'
import './App.css'
import { getClubLineup, getClubs, getMatches, getStandings, type Club, type Standing } from './services/clubs.service'
import {
  buyPlayer,
  deletePlayer,
  getSellPlayerPreview,
  sellPlayer,
  updatePlayer,
  updatePlayerCondition,
  type BuyPlayerResponse,
  type PlayerCondition,
  type SellPlayerPreview,
  type SellPlayerResponse,
} from './services/players.service'
import HomeScreen from './components/HomeScreen'
import NewPlayerScreen from './components/NewPlayerScreen'
import ClubScreen from './components/ClubScreen'
import ClubDirectoryScreen from './components/ClubDirectoryScreen'
import { MatchesScreen, StandingsScreen } from './components/LeagueScreens'


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

type PlayerAction = 'details' | 'edit' | 'condition' | 'buy' | 'sell' | 'delete'
type ToastMessage = { title: string; description: string }

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

const normalizeSearchText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

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
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [activeSection, setActiveSection] = useState('Início')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [matchCount, setMatchCount] = useState(0)
  const [matchCountError, setMatchCountError] = useState<string | null>(null)
  const [leagueLeader, setLeagueLeader] = useState<Standing | null>(null)
  const [leaderError, setLeaderError] = useState<string | null>(null)
  const leaderRequestId = useRef(0)
  const [matchesRefreshKey, setMatchesRefreshKey] = useState(0)
  const [standingsRefreshKey, setStandingsRefreshKey] = useState(0)
  const [openCreateMatchKey, setOpenCreateMatchKey] = useState(0)
  const [clubHistoryRefreshKey, setClubHistoryRefreshKey] = useState(0)
  const [clubHistoryNavigationId, setClubHistoryNavigationId] = useState<number | null>(null)

  const loadLeagueLeader = useCallback(async () => {
    const requestId = ++leaderRequestId.current
    try {
      const standings = await getStandings()
      if (requestId !== leaderRequestId.current) return
      setLeagueLeader(standings[0] ?? null)
      setLeaderError(null)
    } catch (err) {
      if (requestId !== leaderRequestId.current) return
      setLeaderError(err instanceof Error ? err.message : 'Não foi possível carregar a classificação.')
    }
  }, [])

  useEffect(() => {
    let active = true
    void getMatches()
      .then((matches) => {
        if (active) {
          setMatchCount(matches.length)
          setMatchCountError(null)
          if (matches.length > 0) void loadLeagueLeader()
        }
      })
      .catch((err: unknown) => {
        if (active) setMatchCountError(err instanceof Error ? err.message : 'Não foi possível carregar as partidas.')
      })
    return () => {
      active = false
    }
  }, [loadLeagueLeader])

  const handleMatchCountChange = useCallback((count: number) => {
    setMatchCount(count)
    setMatchCountError(null)
    if (count > 0) {
      void loadLeagueLeader()
    } else {
      leaderRequestId.current += 1
      setLeagueLeader(null)
      setLeaderError(null)
    }
  }, [loadLeagueLeader])

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search.trim())
    let result = players.filter((player) =>
      normalizeSearchText(player.name).includes(normalizedSearch),
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

  const activeClub = clubs.find((item) => item.name === activeSection)

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / pageSize))
  const visiblePlayers = filteredPlayers.slice((page - 1) * pageSize, page * pageSize)

  function changeSection(section: string) {
    setClubHistoryNavigationId(null)
    if (section !== 'Partidas') setOpenCreateMatchKey(0)
    setActiveSection(section)
  }

  function openNewMatchDialog() {
    setActiveSection('Partidas')
    setOpenCreateMatchKey((key) => key + 1)
  }

  if (activeSection === 'Início') {
    return (
      <HomeScreen
        totalPlayers={players.length}
        freePlayers={players.filter((player) => !player.club).length}
        totalClubs={clubs.length}
        totalMatches={matchCount}
        matchCountError={matchCountError}
        leagueLeader={leagueLeader}
        leaderError={leaderError}
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
              <Swords size={16} /><span>Partidas</span><small>{matchCount}</small>
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
                className={activeSection === club.name ? 'club-item active' : 'club-item'}
              >
                <span className="club-avatar">{club.acronym}</span>
                {club.name}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="league-card">
              <Trophy size={16} />
              <div><strong>Liga Fictícia 2026</strong><small>{clubs.length} clubes · {filteredPlayers.length} jogadores</small></div>
            </div>
            <div className="league-card">
              <Swords size={16} />
              <div><strong>Partidas disputadas</strong><small>{matchCount}</small></div>
            </div>
            <div className="league-card">
              <Clock3 size={16} />
              <div><strong>Horário de Brasília { new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }</strong></div>
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
            {activeClub ? (
              <>
                <button className="crumb-link" onClick={() => changeSection('Jogadores')}>Mercado</button>
                <ChevronRight size={14} />
                <button className="crumb-link" onClick={() => changeSection('Clubes')}>Clubes</button>
                <ChevronRight size={14} />
                <strong>{activeClub.name}</strong>
              </>
            ) : ['Partidas', 'Classificação'].includes(activeSection) ? (
              <>
                <button className="crumb-link" onClick={() => changeSection('Início')}>Liga</button>
                <ChevronRight size={14} />
                <strong>{activeSection}</strong>
              </>
            ) : (
              <>
                <span>Mercado</span>
                <ChevronRight size={14} />
                <strong>{activeSection === 'Novo jogador' ? 'Jogadores' : activeSection}</strong>
              </>
            )}
          </div>
          <button
            className="icon-button"
            aria-label="Atualizar lista"
            onClick={() => {
              if (activeSection === 'Partidas') {
                setMatchesRefreshKey((key) => key + 1)
              } else if (activeSection === 'Classificação') {
                setStandingsRefreshKey((key) => key + 1)
              } else {
                setPage(1)
                void loadPlayers()
              }
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
                {!loading && !error && visiblePlayers.length === 0 && <tr className='table-card table-card-body'>
                  <td colSpan={10} className="empty-state">
                    <SearchX size={22} />
                    <strong>Nenhum jogador encontrado para "{search || 'a busca'}"</strong>
                    <span>Confira a grafia ou tire alguns filtros. A busca ignora maiúsculas, minusculas e acentos.</span>
                    <button aria-label="Limpar filtros" className="clear-filters empty-state" onClick={() => {
                      setSearch('');
                      setPosition('');
                      setCondition('');
                      setClub('');
                      setAge('');
                      setValueRange('');
                    }}>
                      <X size={9} />
                      Limpar filtros
                    </button>
                  </td>
                </tr> || !loading && error && (
                            <tr className='table-card table-card-body'>
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
                          ) ||                
                <tr className='table-card-body'>

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
                                  canSell={Boolean(player.club)}
                                  canDelete={!player.club}
                                  onSelect={(action) => setActionDialog({ action, player })}
                                />
                              </td>
                            </tr>
                          ))}
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

                  </tr>
                }
              </section>
              <p className="page-note">Overall e valor de mercado são calculados a cada consulta. A busca ignora maiúsculas, minúsculas e acentos.</p>
            </>
          ) : activeSection === 'Clubes' ? (
            <ClubDirectoryScreen
              clubs={clubs}
              loading={loading}
              error={error}
              onCreated={loadPlayers}
              onSelectClub={changeSection}
              onToast={setToast}
            />
          ) : activeClub ? (
            <ClubScreen
              key={`${activeClub.id}-${clubHistoryNavigationId ?? 'default'}`}
              club={activeClub}
              players={players}
              historyRefreshKey={clubHistoryRefreshKey}
              initialTab={clubHistoryNavigationId === activeClub.id ? 'Histórico' : 'Elenco'}
              onBuyPlayers={() => {
                setClub('')
                setTab('Livres')
                setPage(1)
                changeSection('Jogadores')
              }}
              onSellPlayer={(playerId) => {
                const player = players.find((item) => item.id === playerId)
                if (player) setActionDialog({ action: 'sell', player })
              }}
              onToast={(message) => setToast(message)}
            />
          ) : activeSection === 'Partidas' ? (
            <MatchesScreen
              clubs={clubs}
              onToast={setToast}
              onMatchCountChange={handleMatchCountChange}
              refreshKey={matchesRefreshKey}
              openCreateKey={openCreateMatchKey}
              onRefresh={() => setMatchesRefreshKey((key) => key + 1)}
            />
          ) : activeSection === 'Classificação' ? (
            <StandingsScreen
              onOpenMatches={() => changeSection('Partidas')}
              onNewMatch={openNewMatchDialog}
              refreshKey={standingsRefreshKey}
              onRefresh={() => setStandingsRefreshKey((key) => key + 1)}
            />
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
            onComplete={async (message, keepDialogOpen = false) => {
              if (!keepDialogOpen) setActionDialog(null)
              setPage(1)
              await loadPlayers()
              if (actionDialog.action === 'sell') setClubHistoryRefreshKey((version) => version + 1)
              if (!keepDialogOpen) setToast(message)
            }}
            onViewClub={(clubId) => {
              const selectedClub = clubs.find((club) => club.id === clubId)
              setActionDialog(null)
              if (selectedClub) changeSection(selectedClub.name)
            }}
            onViewClubHistory={(clubId) => {
              const selectedClub = clubs.find((club) => club.id === clubId)
              setActionDialog(null)
              if (selectedClub) {
                setClubHistoryNavigationId(clubId)
                setActiveSection(selectedClub.name)
              }
            }}
          />
        )}
      </main>
      {toast && <SuccessToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

export default App

function SuccessToast({ message, onClose }: { message: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 5000)
    return () => window.clearTimeout(timeout)
  }, [onClose])

  return createPortal(
    <aside className="success-toast" role="status" aria-live="polite">
      <CheckCircle2 size={15} />
      <div>
        <strong>{message.title}</strong>
        <p>{message.description}</p>
      </div>
      <button type="button" aria-label="Fechar notificação" onClick={onClose}><X size={13} /></button>
    </aside>,
    document.body,
  )
}

type PlayerActionsProps = {
  player: Player
  canBuy: boolean
  canSell: boolean
  canDelete: boolean
  onSelect: (action: PlayerAction) => void
}

function PlayerActions({ player, canBuy, canSell, canDelete, onSelect }: PlayerActionsProps) {
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
    const height = 250
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
          <button role="menuitem" disabled={!canSell} onClick={() => select('sell')}><ArrowUpRight size={14} />Vender</button>
          <div className="player-actions-divider" />
          <button className="player-action-danger" role="menuitem" disabled={!canDelete} onClick={() => select('delete')}><Trash2 size={14} />Excluir</button>
          {!canDelete && <p>Apenas para jogador livre.</p> || <p>Disponível porque o jogador está livre.</p>}
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
  onComplete: (message: ToastMessage, keepDialogOpen?: boolean) => Promise<void>
  onViewClub: (clubId: number) => void
  onViewClubHistory: (clubId: number) => void
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

function PlayerActionDialog({ action, player, clubs, onClose, onSelectAction, onComplete, onViewClub, onViewClubHistory }: PlayerActionDialogProps) {
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
  const [purchaseReceipt, setPurchaseReceipt] = useState<BuyPlayerResponse | null>(null)
  const [salePreview, setSalePreview] = useState<SellPlayerPreview | null>(null)
  const [saleReceipt, setSaleReceipt] = useState<SellPlayerResponse | null>(null)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  useEffect(() => {
    if ((action !== 'condition' && action !== 'sell') || !player.clubId) return

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

  useEffect(() => {
    if (action !== 'sell') return

    let active = true
    void getSellPlayerPreview(player.id)
      .then((preview) => {
        if (active) setSalePreview(preview)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados da venda.')
      })

    return () => {
      active = false
    }
  }, [action, player.id])

  const titles: Record<PlayerAction, string> = {
    details: 'Detalhes do jogador',
    edit: 'Editar jogador',
    condition: 'Alterar condição física',
    buy: 'Comprar jogador',
    sell: 'Vender jogador',
    delete: 'Excluir jogador',
  }

  const selectedClub = clubs.find((item) => item.id === Number(clubId))
  const purchaseValueCents = Math.round(player.marketValue * 100)
  const purchaseFeeCents = purchaseValueCents > 3000
    ? Math.floor((purchaseValueCents * 5 + 50) / 100)
    : 0
  const purchaseTotalCents = purchaseValueCents + purchaseFeeCents
  const selectedClubCashCents = selectedClub ? Math.round(selectedClub.cash * 100) : 0
  const purchaseLimitExceeded = Boolean(selectedClub && purchaseTotalCents * 2 > selectedClubCashCents)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      let purchaseResult: BuyPlayerResponse | null = null
      let saleResult: SellPlayerResponse | null = null
      let successToast: ToastMessage = {
        title: 'Alteração concluída',
        description: `Os dados de ${player.name} foram atualizados.`,
      }

      if (action === 'edit') {
        const updated = await updatePlayer(player.id, { name, position, age, agility })
        successToast = {
          title: 'Jogador atualizado',
          description: `Os dados de ${updated.name} foram atualizados.`,
        }
      } else if (action === 'condition') {
        const updated = await updatePlayerCondition(player.id, condition)
        const conditionLabel = CONDITION_OPTIONS.find((item) => item.value === updated.condition)?.label ?? updated.condition
        successToast = {
          title: 'Condição alterada',
          description: `${updated.name} agora está ${conditionLabel}. Valor de mercado: ${money(updated.market_value)}.`,
        }
      } else if (action === 'buy') {
        if (!clubId) throw new Error('Selecione um clube para continuar.')
        purchaseResult = await buyPlayer(player.id, {
          club_id: Number(clubId),
          loyalty_until: `${loyaltyUntil}-03:00`,
        })
        const clubName = clubs.find((item) => item.id === Number(clubId))?.name ?? 'o clube selecionado'
        successToast = {
          title: 'Jogador contratado',
          description: `${player.name} agora faz parte do ${clubName}.`,
        }
      } else if (action === 'sell') {
        saleResult = await sellPlayer(player.id)
        successToast = {
          title: 'Jogador vendido',
          description: `${player.name} foi liberado do ${player.club ?? 'clube'}.`,
        }
      } else if (action === 'delete') {
        await deletePlayer(player.id)
        successToast = {
          title: 'Jogador excluído',
          description: `${player.name} saiu da lista. Transações e partidas antigas dele continuam gravadas.`,
        }
      }

      if (purchaseResult) {
        await onComplete(successToast, true)
        setPurchaseReceipt(purchaseResult)
      } else if (saleResult) {
        await onComplete(successToast, true)
        setSaleReceipt(saleResult)
      } else {
        await onComplete(successToast)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setSaving(false)
    }
  }

  if (action === 'buy' && purchaseReceipt) {
    const purchasedClub = clubs.find((item) => item.id === purchaseReceipt.club_id)
    const loyaltyDate = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(purchaseReceipt.contract.loyalty_until))

    return createPortal(
      <div className="player-dialog-backdrop">
        <section className="player-action-dialog player-buy-success" role="dialog" aria-modal="true" aria-labelledby="player-buy-success-title">
          <button className="icon-button tiny player-buy-success-close" type="button" aria-label="Fechar" onClick={onClose}><X size={16} /></button>
          <CheckCircle2 className="player-buy-success-icon" size={25} />
          <h2 id="player-buy-success-title">Compra concluída</h2>
          <p>{purchaseReceipt.player_name} agora é do {purchasedClub?.name ?? 'clube comprador'}.</p>
          <dl className="player-buy-receipt">
            <div><dt><strong>Valor</strong><small>Valor de mercado no momento da compra</small></dt><dd>{money(purchaseReceipt.value)}</dd></div>
            <div><dt><strong>Taxa</strong><small>{purchaseReceipt.fee > 0 ? '5% do valor, porque passa de 30,00' : 'Sem taxa para compras até 30,00'}</small></dt><dd>{money(purchaseReceipt.fee)}</dd></div>
            <div className="player-buy-total"><dt><strong>Custo total</strong><small>Valor + taxa</small></dt><dd>{money(purchaseReceipt.value + purchaseReceipt.fee)}</dd></div>
            <div><dt>Fim da fidelidade</dt><dd>{loyaltyDate}</dd></div>
            <div><dt>Contrato</dt><dd><span className="player-contract-active">● ATIVO</span></dd></div>
            <div className="player-buy-cash"><dt><strong>Novo caixa do {purchasedClub?.name ?? 'clube'}</strong></dt><dd>{money(purchaseReceipt.club_cash)}</dd></div>
          </dl>
          <footer>
            <button className="secondary-button" type="button" onClick={() => onViewClub(purchaseReceipt.club_id)}>Ver clube <ChevronRight size={13} /></button>
            <button className="primary-button" type="button" onClick={onClose}>Fechar</button>
          </footer>
        </section>
      </div>,
      document.body,
    )
  }

  if (action === 'sell' && saleReceipt) {
    const sellingClub = clubs.find((item) => item.id === saleReceipt.club_id)
    return createPortal(
      <div className="player-dialog-backdrop">
        <section className="player-action-dialog player-buy-success player-sale-success" role="dialog" aria-modal="true" aria-labelledby="player-sale-success-title">
          <button className="icon-button tiny player-buy-success-close" type="button" aria-label="Fechar" onClick={onClose}><X size={16} /></button>
          <CheckCircle2 className="player-buy-success-icon" size={25} />
          <h2 id="player-sale-success-title">Venda concluída</h2>
          <p>{saleReceipt.player_name} agora está livre. O {sellingClub?.name ?? 'clube'} recebeu o crédito líquido da venda.</p>
          <dl className="player-buy-receipt">
            <div><dt><strong>Valor de compra</strong></dt><dd className="player-sale-purchase-value">{money(saleReceipt.purchase_value)}</dd></div>
            <div><dt><strong>Valor da venda</strong><small>Valor de mercado no momento da venda</small></dt><dd>{money(saleReceipt.value)}</dd></div>
            <div><dt><strong>Dias restantes</strong></dt><dd>{saleReceipt.remaining_days}</dd></div>
            <div><dt><strong>Multa</strong><small>{saleReceipt.penalty_rate}% pela fidelidade restante</small></dt><dd>{money(saleReceipt.penalty)}</dd></div>
            <div><dt><strong>Lucro</strong><small>Venda menos valor de compra</small></dt><dd className={saleReceipt.profit < 0 ? 'player-sale-negative' : 'player-sale-positive'}>{saleReceipt.profit > 0 ? '+' : ''}{money(saleReceipt.profit)}</dd></div>
            <div><dt><strong>Comissão</strong><small>Calculada sobre o lucro positivo</small></dt><dd>{money(saleReceipt.fee)}</dd></div>
            <div className="player-buy-total"><dt><strong>Crédito no caixa</strong><small>Valor da venda menos comissão e multa</small></dt><dd>+{money(saleReceipt.cash_change)}</dd></div>
            <div><dt>Contrato</dt><dd><span className={`condition condition-${saleReceipt.contract_status === 'RESCINDIDO' ? 'sick' : 'poor'}`}><i />{saleReceipt.contract_status === 'RESCINDIDO' ? 'RESCINDIDO' : 'ENCERRADO'}</span></dd></div>
            <div className="player-buy-cash"><dt><strong>Novo caixa do {sellingClub?.name ?? 'clube'}</strong></dt><dd>{money(saleReceipt.club_cash)}</dd></div>
          </dl>
          <footer>
            <button className="secondary-button" type="button" onClick={() => onViewClubHistory(saleReceipt.club_id)}>Ver histórico <History size={13} /></button>
            <button className="primary-button" type="button" onClick={onClose}>Fechar</button>
          </footer>
        </section>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className={`player-dialog-backdrop ${action === 'details' ? 'player-details-backdrop' : ''}`} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose()
    }}>
      <section className={`player-action-dialog ${action === 'details' ? 'player-details-drawer' : ''} ${action === 'condition' ? 'player-condition-dialog' : ''} ${action === 'buy' || action === 'sell' ? 'player-buy-dialog' : ''} ${action === 'sell' ? 'player-sale-dialog' : ''} ${action === 'delete' ? 'player-delete-dialog' : ''}`} role="dialog" aria-modal="true" aria-labelledby="player-action-title">
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
          <header className="player-details-heading">
            <div>
              <h2 id="player-action-title">{action === 'delete' ? `Excluir ${player.name}?` : titles[action]}</h2>
              <p>{action === 'condition'
                ? 'A condição muda o desconto do valor de mercado, recalculado ao salvar.'
                : action === 'buy'
                  ? 'Escolha o clube comprador e até quando vai a fidelidade do contrato.'
                  : action === 'sell'
                    ? `Confira os valores da venda do ${player.club ?? 'clube'} antes de confirmar.`
                    : action === 'delete'
                      ? 'O jogador sairá da lista e da busca, mas as transações e as partidas antigas dele continuam como foram gravadas.'
                      : 'Edite nome, posição, idade e agilidade. Os demais não mudam.'}</p>
            </div>
            <button className="icon-button tiny" type="button" aria-label="Fechar" onClick={onClose} disabled={saving}><X size={16} /></button>
          </header>
        )}

        {action === 'details' ? (
          <div className="player-detail-content">
            <div className="player-detail-cards">
              <article><span>Valor de mercado <Coins size={12} /></span><strong>{money(player.marketValue)}</strong><small>Calculado automaticamente</small></article>
              <article><span>Valor base <Tag size={12} /></span><strong>{money(player.baseValue)}</strong><small>Calculado no cadastro</small></article>
              <article><span>Overall <ChartColumn size={12} /></span><strong>{player.overall}</strong><small>Calculado pela posição</small></article>
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
              {!player.club
                ? <button className="primary-button" type="button" onClick={() => onSelectAction('buy')}><ShoppingCart size={13} />Comprar</button>
                : <button className="primary-button" type="button" onClick={() => onSelectAction('sell')}><ArrowUpRight size={13} />Vender</button>}
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
                        <div>
                          <strong>{item.label}</strong>
                          {item.value === player.apiCondition && <small className="player-condition-current">Atual</small>}
                        </div>
                        <small>{item.description}</small>
                        {player.apiCondition === 'DOENTE' && item.value === 'APTO' && <small><Lock size={7} /> De Doente não passa direto para Apto</small>}
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
                <label className="np-field np-name-field">
                  <span>Nome</span>
                  <span className="np-name-control">
                    <User size={14} />
                    <input
                      type="text"
                      required
                      value={name}
                      placeholder="EX: Davi Melo"
                      onChange={(event) => setName(event.target.value)}
                      maxLength={100}
                      minLength={3}
                      autoComplete="off"
                    />
                  </span>
                  <small>De 3 a 100 caracteres, com pelo menos duas palavras e sem números.</small>
                </label>

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
                  <label className="np-field">
                    <span>Idade</span>
                    <input type="number" min={player.age} max={45} value={age} onChange={(event) => setAge(Number(event.target.value))} />
                    <small>De {player.age} a 45 anos; a idade não pode diminuir.</small>
                  </label>
                  <label className="np-field">
                    <span>Agilidade</span>
                    <input type="number" min={1} max={age >= 35 ? 85 : 100} value={agility} onChange={(event) => setAgility(Number(event.target.value))} />
                    <small>{age >= 35 ? 'Máximo 85 aos 35+.' : '1 a 100; máx. 85 aos 35+.'}</small>
                  </label>
                </div>
                {player.club && <small>A posição não pode ser alterada enquanto o jogador pertence a um clube.</small>}
              </div>
            )}
            {action === 'buy' && (
              <div className="player-buy-form">
                {error && (
                  <div className="player-buy-error" role="alert">
                    <TriangleAlert size={14} />
                    <div><strong>Compra recusada</strong><p>{error.includes('50%') && selectedClub && purchaseLimitExceeded
                      ? `O custo da compra (${money(purchaseTotalCents / 100)}) passa do limite de 50% do caixa (${money(selectedClubCashCents / 200)}).`
                      : error}</p></div>
                  </div>
                )}

                <div className="player-buy-player">
                  <span className="player-details-avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <div><strong>{player.name}</strong><small>{player.position} · {player.positionName} · {player.age} anos</small></div>
                  <span><small>Valor de mercado</small><strong>{money(player.marketValue)}</strong></span>
                </div>

                <label className="player-buy-label">
                  <span>Clube comprador</span>
                  <span className="player-buy-select-wrap"><Shield size={13} />
                    <select required value={clubId} onChange={(event) => setClubId(event.target.value)}>
                      <option value="">Selecione um clube</option>
                      {clubs.map((club) => <option key={club.id} value={club.id}>{club.name} ({club.acronym}) · caixa {money(club.cash)}</option>)}
                    </select>
                    <ChevronDown size={13} />
                  </span>
                </label>
                {selectedClub && <p className={`player-buy-cash-note ${purchaseLimitExceeded ? 'is-over' : ''}`}>Caixa atual: {money(selectedClub.cash)}. O custo total (valor + taxa) pode ir até 50% do caixa.</p>}

                <label className="player-buy-label">
                  <span>Fim da fidelidade</span>
                  <span className="player-buy-date-fields">
                    <span><CalendarClock size={13} /><input required type="date" value={loyaltyUntil.split('T')[0]} onChange={(event) => setLoyaltyUntil(`${event.target.value}T${loyaltyUntil.split('T')[1] ?? '15:00'}`)} /></span>
                    <span><Clock3 size={13} /><input required type="time" value={loyaltyUntil.split('T')[1] ?? '15:00'} onChange={(event) => setLoyaltyUntil(`${loyaltyUntil.split('T')[0]}T${event.target.value}`)} /></span>
                  </span>
                  <small>Depois do momento da compra até 1.095 dias. Horário de Brasília; enviado com o fuso (-03:00).</small>
                </label>

                <div className="player-buy-tax-note"><Info size={12} /><p>A taxa é de 5% do valor de mercado, só quando ele passa de 30,00. Taxa, custo e novo caixa são calculados ao confirmar.</p></div>
                {clubs.length === 0 && <small>Nenhum clube disponível para a compra.</small>}
              </div>
            )}
            {action === 'sell' && (
              <div className="player-buy-form player-sale-form">
                {lineupStatus === true && (
                  <div className="player-sale-warning">
                    <TriangleAlert size={14} />
                    <strong>{player.name} é titular</strong>
                    <p></p>
                    <p><span>Ao vender, ele sai da escalação e fica livre. O {player.club} só volta a jogar partidas depois de escalar novamente 5 titulares.</span></p>
                  </div>
                )}
                {error && (
                  <div className="player-buy-error" role="alert">
                    <TriangleAlert size={14} />
                    <div><strong>Não foi possível preparar a venda</strong><p>{error}</p></div>
                  </div>
                )}
                <div className="player-buy-player">
                  <span className="player-details-avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <div><strong>{player.name}</strong><small>{player.position} · {player.positionName} · {player.age} anos</small></div>
                  <span><small>Valor de mercado</small><strong>{money(salePreview?.market_value ?? player.marketValue)}</strong></span>
                </div>

                {salePreview ? (
                  <>
                    <div className="player-sale-details">
                      <div><span>Clube vendedor</span><strong>{salePreview.club_name}</strong></div>
                      <div><span>Valor de compra</span><strong className="player-sale-purchase-value">{money(salePreview.purchase_value)}</strong></div>
                      <div><span>Fim da fidelidade</span><strong>{new Intl.DateTimeFormat('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hourCycle: 'h23',
                      }).format(new Date(salePreview.loyalty_until))}</strong></div>
                      <div><span>Dias restantes</span><strong>{salePreview.remaining_days}</strong></div>
                      <div><span>% multa se vender agora</span><strong className="player-sale-penalty">{salePreview.penalty_rate}%</strong></div>
                    </div>
                  </>
                ) : !error ? <p className="player-sale-loading">Carregando os dados do contrato e da venda...</p> : null}

                <div className="player-buy-tax-note"><Info size={12} /><p>A multa depende dos dias restantes de fidelidade e a comissão incide sobre o lucro positivo. Os valores finais são recalculados ao confirmar.</p></div>
              </div>
            )}
            {action === 'delete' && (
              <div className="player-delete-summary">
                <span className="player-details-avatar">{player.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                <div><strong>{player.name}</strong><small>{player.position} · {player.positionName} · {player.age} anos</small></div>
                <span className="free-badge">{player.club ?? 'Livre'}</span>
              </div>
            )}
            {error && action !== 'buy' && action !== 'sell' && <p className="player-action-error" role="alert">{error}</p>}
            <footer>
              <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
              <button className={action === 'delete' ? 'player-confirm-danger' : 'primary-button'} type="submit" disabled={saving || (action === 'buy' && (clubs.length === 0 || !selectedClub)) || (action === 'sell' && !salePreview)}>
                {saving ? 'Salvando...' : action === 'delete' ? <><Trash2 size={13} /> Excluir jogador</> : action === 'buy' ? <><ShoppingCart size={13} /> Confirmar compra</> : action === 'sell' ? <><HandCoins size={13} /> Confirmar venda</> : action === 'condition' ? 'Salvar condição' : 'Salvar alterações'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>,
    document.body,
  )
}