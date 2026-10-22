import { useEffect, useMemo, useState } from 'react'
import { getPlayers, type Player as ApiPlayer } from './services/players.service'
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  HeartPulse,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShoppingCart,
  Trophy,
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
import { getClubs, type Club } from './services/clubs.service'
import HomeScreen from './components/HomeScreen'


type Player = {
  id: number
  name: string
  position: ApiPlayer['position']
  positionName: string
  overall: number
  agility: number
  age: number
  condition: 'Apto' | 'Mal condicionado' | 'Doente'
  baseValue: number
  marketValue: number
  club: string | null
  acronym: string | null
}

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
    baseValue: player.base_value,
    marketValue: player.market_value,
    club: playerClub?.name ?? null,
    acronym: playerClub?.acronym ?? null,
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
        playersResponse.data.map((player) =>
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
            <button className={activeSection === 'Jogadores' ? 'nav-item active' : 'nav-item'} onClick={() => changeSection('Jogadores')}>
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
            <span>Mercado</span><ChevronRight size={14} /><strong>{activeSection}</strong>
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
          {activeSection === 'Jogadores' ? (
            <>
              <div className="page-heading">
                <div className="heading-icon"><Users size={22} /></div>
                <div className="heading-copy">
                  <h1>Jogadores</h1>
                  <p>Cadastre jogadores, acompanhe os indicadores e compre os que estão livres.</p>
                </div>
                <button className="primary-button" onClick={() => window.alert('O formulário de cadastro será implementado na próxima etapa.')}>
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
                            <div className="row-actions">
                              {!player.club && <button className="buy-button" onClick={() => window.alert(`A compra de ${player.name} será implementada na próxima etapa.`)}><ShoppingCart size={13} /> Comprar</button>}
                              <button className="icon-button tiny" aria-label={`Mais ações para ${player.name}`} onClick={() => window.alert(`Ações de ${player.name} serão implementadas na próxima etapa.`)}><MoreHorizontal size={17} /></button>
                            </div>
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
      </main>
    </div>
  )
}

export default App