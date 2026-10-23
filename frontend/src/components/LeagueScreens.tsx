import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ListOrdered,
  RefreshCw,
  Shield,
  Swords,
  X,
} from 'lucide-react'

import {
  createMatch,
  getMatch,
  getMatches,
  getStandings,
  type Club,
  type MatchDetails,
  type MatchDuel,
  type MatchSummary,
  type Standing,
} from '../services/clubs.service'
import './LeagueScreens.css'

type ToastMessage = { title: string; description: string }

type MatchesScreenProps = {
  clubs: Club[]
  onToast: (message: ToastMessage) => void
  onMatchCountChange: (count: number) => void
  refreshKey: number
  openCreateKey: number
  onRefresh: () => void
}

const formationLabels: Record<string, string> = {
  '3-1': '3-1',
  '2-2': '2-2',
  '2-1-1': '2-1-1',
  '1-2-1': '1-2-1',
}

const positions: Record<string, string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LAT: 'Lateral',
  MEI: 'Meio-campo',
  ATA: 'Atacante',
}

const attributes: Record<MatchDuel['attack_attribute'], string> = {
  shooting: 'Finalização',
  passing: 'Passe',
  dribbling: 'Drible',
}

function dateTime(value: string) {
  const date = new Date(value)
  return {
    date: new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function resultLabel(result: MatchSummary['result']) {
  if (result === 'EMPATE') return 'Empate'
  return result === 'MANDANTE' ? 'Vitória do mandante' : 'Vitória do visitante'
}

function score(match: MatchSummary) {
  return `${match.home_goals} × ${match.away_goals}`
}

function matchClub(match: MatchSummary, clubId: number) {
  return match.home_club_id === clubId || match.away_club_id === clubId
}

function MatchScore({ match, compact = false }: { match: MatchSummary; compact?: boolean }) {
  return <span className={`league-match-score ${compact ? 'compact' : ''}`}>{score(match)}</span>
}

function MatchRow({ match, onOpen }: { match: MatchSummary; onOpen: (id: number) => void }) {
  const played = dateTime(match.played_at)
  return (
    <tr>
      <td>{played.date}<small>{played.time}</small></td>
      <td><strong>{match.home_club_name}</strong><span className="league-acronym">{match.home_club_name.slice(0, 3).toUpperCase()}</span></td>
      <td><MatchScore match={match} compact /></td>
      <td><span className="league-acronym">{match.away_club_name.slice(0, 3).toUpperCase()}</span><strong>{match.away_club_name}</strong></td>
      <td><span className="league-result-pill">{resultLabel(match.result)}</span></td>
      <td><button className="league-link-button" type="button" onClick={() => onOpen(match.id)}>Ver duelos <ChevronRight size={13} /></button></td>
    </tr>
  )
}

function ScoreSummary({ match }: { match: MatchSummary }) {
  const played = dateTime(match.played_at)
  return (
    <section className="league-score-summary">
      <div className="league-score-team home">
        <div><strong>{match.home_club_name}</strong><small>Mandante</small></div>
        <span className="league-club-mark">{match.home_club_name.slice(0, 3).toUpperCase()}</span>
      </div>
      <div className="league-score-center">
        <MatchScore match={match} />
        <small>{played.date}, {played.time}</small>
        <span className="league-result-pill">{resultLabel(match.result)}</span>
      </div>
      <div className="league-score-team away">
        <span className="league-club-mark">{match.away_club_name.slice(0, 3).toUpperCase()}</span>
        <div><strong>{match.away_club_name}</strong><small>Visitante</small></div>
      </div>
    </section>
  )
}

type PitchPlayer = {
  id: number
  name: string
  position: MatchDuel['attacker_position']
  condition: MatchDuel['attacker_condition']
  metricLabel: string
  metricValue: number
}

function collectPitchPlayers(match: MatchDetails, clubId: number): PitchPlayer[] {
  const players = new Map<number, PitchPlayer>()
  for (const duel of match.duels) {
    const attackerIsTeam = duel.attacking_club_id === clubId
    const attackerId = attackerIsTeam ? duel.attacker_id : duel.defender_id
    const attacker = attackerIsTeam
      ? {
          id: duel.attacker_id,
          name: duel.attacker_name,
          position: duel.attacker_position,
          condition: duel.attacker_condition,
          metricLabel: attributes[duel.attack_attribute],
          metricValue: duel.attack_value,
        }
      : {
          id: duel.defender_id,
          name: duel.defender_name,
          position: duel.defender_position,
          condition: duel.defender_condition,
          metricLabel: 'Defesa',
          metricValue: duel.defense_value,
        }
    if (!players.has(attackerId)) players.set(attackerId, attacker)

    const defenderIsTeam = duel.attacking_club_id !== clubId
    if (defenderIsTeam) {
      const existing = players.get(duel.defender_id)
      if (!existing) {
        players.set(duel.defender_id, {
          id: duel.defender_id,
          name: duel.defender_name,
          position: duel.defender_position,
          condition: duel.defender_condition,
          metricLabel: 'Defesa',
          metricValue: duel.defense_value,
        })
      }
    }
  }
  return [...players.values()]
}

function pitchCoordinates(formation: string, position: PitchPlayer['position'], ordinal: number, home: boolean) {
  const base = formation === '3-1'
    ? { defense: [22, 50, 78], midfield: [], attack: [50] }
    : formation === '2-2'
      ? { defense: [35, 65], midfield: [], attack: [35, 65] }
      : formation === '1-2-1'
        ? { defense: [50], midfield: [38, 62], attack: [50] }
        : { defense: [35, 65], midfield: [50], attack: [50] }
  if (position === 'GOL') return { x: home ? 7 : 93, y: 50 }
  let line: number[]
  let depth: number
  if (position === 'ZAG' || position === 'LAT') {
    line = base.defense
    depth = home ? 20 : 80
  } else if (position === 'MEI' && base.midfield.length > 0) {
    line = base.midfield
    depth = home ? 43 : 57
  } else {
    line = base.attack
    depth = home ? 71 : 29
  }
  const rowIndex = Math.min(ordinal, line.length - 1)
  return { x: home ? depth : 100 - depth, y: line[rowIndex] ?? 50 }
}

function MatchPitch({ match }: { match: MatchDetails }) {
  const homePlayers = collectPitchPlayers(match, match.home_club_id)
  const awayPlayers = collectPitchPlayers(match, match.away_club_id)
  function renderPlayers(players: PitchPlayer[], formation: string, home: boolean) {
    const roleCount = new Map<string, number>()
    return players.map((player) => {
      const group = player.position === 'ZAG' || player.position === 'LAT'
        ? 'defense'
        : player.position === 'MEI'
          ? 'midfield'
          : player.position === 'ATA'
            ? 'attack'
            : 'keeper'
      const ordinal = roleCount.get(group) ?? 0
      roleCount.set(group, ordinal + 1)
      const point = pitchCoordinates(formation, player.position, ordinal, home)
      return (
        <div
          className={`league-pitch-player ${home ? 'home' : 'away'} ${player.condition === 'MAL_CONDICIONADO' ? 'poor' : ''}`}
          key={`${home ? 'h' : 'a'}-${player.id}`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          {player.condition === 'MAL_CONDICIONADO' && <span className="league-player-condition">!</span>}
          <span className="league-pitch-avatar">{initials(player.name)}</span>
          <strong>{player.name}</strong>
          <small>{player.position} · {player.metricLabel.slice(0, 3)} {player.metricValue}</small>
        </div>
      )
    })
  }
  return (
    <section className="league-panel league-on-pitch">
      <header className="league-panel-heading">
        <div><h2>Em campo</h2><p>Titulares de cada clube na formação da partida e os valores usados nos duelos, já com o efeito da condição.</p></div>
        <div className="league-pitch-legend"><span>● Mal condicionado</span><span><Check size={11} /> Gol no duelo</span></div>
      </header>
      <div className="league-pitch">
        <div className="league-pitch-center-circle" />
        <div className="league-pitch-center-line" />
        <div className="league-pitch-box left" />
        <div className="league-pitch-box right" />
        <div className="league-pitch-goal left" />
        <div className="league-pitch-goal right" />
        <div className="league-pitch-team-label home"><strong>{match.home_club_name}</strong><span>{formationLabels[match.home_formation]}</span><small>ataque →</small></div>
        <div className="league-pitch-team-label away"><strong>{match.away_club_name}</strong><span>{formationLabels[match.away_formation]}</span><small>← ataque</small></div>
        {renderPlayers(homePlayers, match.home_formation, true)}
        {renderPlayers(awayPlayers, match.away_formation, false)}
      </div>
    </section>
  )
}

function DuelTeam({ duels, clubName, acronym }: { duels: MatchDuel[]; clubName: string; acronym: string }) {
  const goals = duels.filter((duel) => duel.goal).length
  return (
    <>
      <tr className="league-duel-team-heading"><td colSpan={6}><span className="league-acronym">{acronym}</span><strong>Ataques do {clubName}</strong><small>{goals} {goals === 1 ? 'gol' : 'gols'}</small></td></tr>
      {duels.map((duel) => (
        <tr key={duel.order}>
          <td><span className="league-duel-order">{duel.order}</span></td>
          <td><span className="league-person"><i>{initials(duel.attacker_name)}</i><span><strong>{duel.attacker_name}</strong><small>{positions[duel.attacker_position]}, {duel.attacker_position} · {clubName}</small></span></span></td>
          <td>{attributes[duel.attack_attribute]} <strong>{duel.attack_value}</strong></td>
          <td><span className="league-person"><i className="defender">{initials(duel.defender_name)}</i><span><strong>{duel.defender_name}</strong><small>{positions[duel.defender_position]}, {duel.defender_position}</small></span></span></td>
          <td>Defesa <strong>{duel.defense_value}</strong></td>
          <td><span className={`league-duel-result ${duel.goal ? 'goal' : ''}`}>{duel.goal ? <><CheckCircle2 size={11} /> Gol</> : 'Sem gol'}</span></td>
        </tr>
      ))}
    </>
  )
}

function MatchDetailsPage({ match, onBack }: { match: MatchDetails; onBack: () => void }) {
  const homeDuels = match.duels.filter((duel) => duel.attacking_club_id === match.home_club_id)
  const awayDuels = match.duels.filter((duel) => duel.attacking_club_id === match.away_club_id)
  const played = dateTime(match.played_at)
  return (
    <div className="league-page league-match-detail-page">
      <button className="league-back-button" type="button" onClick={onBack}><ArrowLeft size={14} /> Voltar para partidas</button>
      <ScoreSummary match={match} />
      <MatchPitch match={match} />
      <section className="league-panel league-duels-panel">
        <header className="league-panel-heading">
          <div><h2>Duelos</h2><p>Os 3 ataques do mandante e depois os 3 do visitante. Os jogadores de linha vão do 1º (mais recuado) ao 4º (mais avançado).</p></div>
          <div className="league-pitch-legend"><span><Check size={11} /> Gol no duelo</span><span>● Mal condicionado</span></div>
        </header>
        <div className="league-table-scroll">
          <table className="league-table league-duels-table">
            <thead><tr><th>Duelo</th><th>Atacante</th><th>Ataque</th><th>Defensor</th><th>Defesa</th><th>Resultado</th></tr></thead>
            <tbody>
              <DuelTeam duels={homeDuels} clubName={match.home_club_name} acronym={match.home_club_name.slice(0, 3).toUpperCase()} />
              <DuelTeam duels={awayDuels} clubName={match.away_club_name} acronym={match.away_club_name.slice(0, 3).toUpperCase()} />
            </tbody>
          </table>
        </div>
      </section>
      <p className="league-footnote">Partida jogada em {played.date}, às {played.time}, horário de Brasília. As formações, atributos e condições são os snapshots gravados nos duelos.</p>
    </div>
  )
}

export function MatchesScreen({ clubs, onToast, onMatchCountChange, refreshKey, openCreateKey, onRefresh }: MatchesScreenProps) {
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [loadedRefreshKey, setLoadedRefreshKey] = useState<number | null>(null)
  const loading = loadedRefreshKey !== refreshKey
  const [error, setError] = useState<{ refreshKey: number; message: string } | null>(null)
  const [filterClubId, setFilterClubId] = useState('')
  const [createOpen, setCreateOpen] = useState(openCreateKey > 0)
  const [homeClubId, setHomeClubId] = useState('')
  const [awayClubId, setAwayClubId] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<MatchDetails | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    void getMatches()
      .then((items) => {
        if (!active) return
        setMatches(items)
        setError(null)
        onMatchCountChange(items.length)
      })
      .catch((err: unknown) => {
        if (active) setError({
          refreshKey,
          message: err instanceof Error ? err.message : 'Não foi possível carregar as partidas.',
        })
      })
      .finally(() => {
        if (active) setLoadedRefreshKey(refreshKey)
      })
    return () => {
      active = false
    }
  }, [onMatchCountChange, refreshKey])

  const filteredMatches = useMemo(
    () => matches.filter((match) => !filterClubId || matchClub(match, Number(filterClubId))),
    [matches, filterClubId],
  )

  const currentError = error?.refreshKey === refreshKey ? error.message : null
  async function openMatch(id: number) {
    setDetailLoading(true)
    setDetailError(null)
    try {
      setSelectedMatch(await getMatch(id))
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Não foi possível carregar os duelos.')
    } finally {
      setDetailLoading(false)
    }
  }

  function openCreateDialog() {
    setHomeClubId('')
    setAwayClubId('')
    setCreateError(null)
    setCreateOpen(true)
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const created = await createMatch({
        home_club_id: Number(homeClubId),
        away_club_id: Number(awayClubId),
      })
      setCreateOpen(false)
      setSelectedMatch(created)
      onToast({ title: 'Partida jogada', description: `${created.home_club_name} ${score(created)} ${created.away_club_name}. Placar e duelos foram salvos.` })
      try {
        const refreshed = await getMatches()
        setMatches(refreshed)
        onMatchCountChange(refreshed.length)
      } catch (refreshErr) {
        setMatches((current) => [created, ...current.filter((match) => match.id !== created.id)])
        onMatchCountChange(matches.length + 1)
        const reason = refreshErr instanceof Error ? ` ${refreshErr.message}` : ''
        const refreshMessage = `Partida salva, mas não foi possível atualizar o histórico.${reason}`
        setDetailError(refreshMessage)
        onToast({ title: 'Partida salva; histórico desatualizado', description: refreshMessage })
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Não foi possível jogar a partida.')
    } finally {
      setCreating(false)
    }
  }

  if (selectedMatch) {
    return <MatchDetailsPage match={selectedMatch} onBack={() => setSelectedMatch(null)} />
  }

  const latestMatch = filteredMatches[0]
  return (
    <div className="league-page">
      <div className="league-page-heading">
        <div className="league-page-icon"><Swords size={19} /></div>
        <div className="league-page-title"><h1>Partidas</h1><p>Jogue partidas entre clubes com os 5 titulares escalados e acompanhe o histórico.</p></div>
        <button className="primary-button" type="button" onClick={openCreateDialog}><span>＋</span> Nova partida</button>
      </div>

      <section className="league-latest-section">
        <div className="league-section-label">Última partida</div>
        {loading && <div className="league-empty">Carregando partidas...</div>}
        {currentError && <div className="league-error" role="alert"><AlertCircle size={15} />{currentError}<button type="button" onClick={onRefresh}>Tentar novamente</button></div>}
        {!loading && !currentError && latestMatch && (
          <div className="league-panel league-latest-match">
            <ScoreSummary match={latestMatch} />
            <button className="secondary-button" type="button" onClick={() => void openMatch(latestMatch.id)}>Ver duelos <ChevronRight size={13} /></button>
          </div>
        )}
        {!loading && !currentError && !latestMatch && <div className="league-empty">Ainda não há partidas. Jogue a primeira partida entre dois clubes com escalação completa.</div>}
      </section>

      <section className="league-panel league-match-history">
        <header className="league-history-heading">
          <div><h2>Histórico de partidas</h2><p>Da mais recente para a mais antiga.</p></div>
          <label className="league-club-filter"><Shield size={13} /><select value={filterClubId} onChange={(event) => setFilterClubId(event.target.value)}><option value="">Clube: todos</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select><ChevronDown size={13} /></label>
        </header>
        {detailError && <p className="league-error inline" role="alert">{detailError}</p>}
        {detailLoading && <p className="league-empty">Carregando duelos...</p>}
        <div className="league-table-scroll">
          <table className="league-table league-matches-table">
            <thead><tr><th>Data e hora</th><th>Mandante</th><th>Placar</th><th>Visitante</th><th>Resultado</th><th /></tr></thead>
            <tbody>{filteredMatches.map((match) => <MatchRow key={match.id} match={match} onOpen={(id) => void openMatch(id)} />)}</tbody>
          </table>
          {!loading && !currentError && filteredMatches.length === 0 && <p className="league-empty">{matches.length ? 'Nenhuma partida para o clube selecionado.' : 'Nenhuma partida registrada.'}</p>}
        </div>
        <footer className="league-table-footer">{filteredMatches.length} {filteredMatches.length === 1 ? 'partida' : 'partidas'}</footer>
      </section>
      <p className="league-footnote">Partidas da mais recente para a mais antiga, com filtro por clube. “Ver duelos” abre a partida.</p>

      {createOpen && (
        <div className="league-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setCreateOpen(false) }}>
          <section className="league-create-dialog" role="dialog" aria-modal="true" aria-labelledby="league-create-title">
            <button className="league-dialog-close" type="button" aria-label="Fechar" onClick={() => setCreateOpen(false)} disabled={creating}><X size={17} /></button>
            <header><h2 id="league-create-title">Nova partida</h2><p>Escolha o mandante e o visitante. O placar sai dos atributos dos titulares, sem sorteio.</p></header>
            {createError && <div className="league-create-error" role="alert"><AlertCircle size={15} /><div><strong>Não foi possível jogar a partida</strong><p>{createError}</p></div></div>}
            <form onSubmit={(event) => void handleCreate(event)}>
              <label className="league-form-field"><span>Mandante</span><span className="league-select-wrap"><Shield size={14} /><select required value={homeClubId} onChange={(event) => setHomeClubId(event.target.value)}><option value="">Selecione o clube mandante</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name} ({club.acronym})</option>)}</select><ChevronDown size={14} /></span><small>Faz os 3 primeiros ataques.</small></label>
              <label className="league-form-field"><span>Visitante</span><span className="league-select-wrap"><Shield size={14} /><select required value={awayClubId} onChange={(event) => setAwayClubId(event.target.value)}><option value="">Selecione o clube visitante</option>{clubs.filter((club) => String(club.id) !== homeClubId).map((club) => <option key={club.id} value={club.id}>{club.name} ({club.acronym})</option>)}</select><ChevronDown size={14} /></span><small>Precisa ser um clube diferente do mandante.</small></label>
              <div className="league-match-rules"><CircleHelp size={14} /><div><strong>Como sai o placar</strong><p>Cada time faz 3 ataques. Os valores usados nos duelos são definidos pela posição: finalização (ATA), passe (MEI) ou drible (ZAG e LAT), contra a defesa. Um ataque é gol quando supera a defesa adversária. Mal condicionado tem os atributos reduzidos em 15%. Os dois clubes precisam ter 5 titulares escalados; a partida não mexe no caixa.</p></div></div>
              <footer><button className="secondary-button" type="button" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</button><button className="primary-button" type="submit" disabled={creating || !homeClubId || !awayClubId}>{creating ? <><RefreshCw className="league-spin" size={13} /> Jogando...</> : <><Swords size={13} /> Jogar partida</>}</button></footer>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

type StandingsScreenProps = {
  onOpenMatches: () => void
  onNewMatch: () => void
  refreshKey: number
  onRefresh: () => void
}

export function StandingsScreen({ onOpenMatches, onNewMatch, refreshKey, onRefresh }: StandingsScreenProps) {
  const [standings, setStandings] = useState<Standing[]>([])
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [loadedRefreshKey, setLoadedRefreshKey] = useState<number | null>(null)
  const loading = loadedRefreshKey !== refreshKey
  const [error, setError] = useState<{ refreshKey: number; message: string } | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([getStandings(), getMatches()])
      .then(([table, playedMatches]) => {
        if (!active) return
        setStandings(table)
        setMatches(playedMatches)
        setError(null)
      })
      .catch((err: unknown) => {
        if (active) setError({
          refreshKey,
          message: err instanceof Error ? err.message : 'Não foi possível carregar a classificação.',
        })
      })
      .finally(() => {
        if (active) setLoadedRefreshKey(refreshKey)
      })
    return () => {
      active = false
    }
  }, [refreshKey])

  return (
    <div className="league-page">
      <div className="league-page-heading">
        <div className="league-page-icon standings"><ListOrdered size={20} /></div>
        <div className="league-page-title"><h1>Classificação</h1><p>Todos os clubes, com 3 pontos por vitória e 1 por empate.</p></div>
        <button className="primary-button" type="button" onClick={onNewMatch}><span>＋</span> Nova partida</button>
      </div>
      {error?.refreshKey === refreshKey && <div className="league-error" role="alert"><AlertCircle size={15} />{error.message}<button type="button" onClick={onRefresh}>Tentar novamente</button></div>}
      {loading ? <div className="league-empty">Carregando classificação...</div> : error?.refreshKey !== refreshKey && (
        <div className="league-standings-layout">
          <section className="league-panel league-standings-panel">
            <div className="league-table-scroll">
              <table className="league-table league-standings-table">
                <thead><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>Pts</th></tr></thead>
                <tbody>
                  {standings.map((standing) => (
                    <tr key={standing.club_id}>
                      <td><span className={`league-position ${standing.position === 1 ? 'leader' : ''}`}>{standing.position}</span></td>
                      <td><span className="league-standing-club"><span className="league-acronym">{standing.club_name.slice(0, 3).toUpperCase()}</span><strong>{standing.club_name}</strong></span></td>
                      <td>{standing.played}</td><td>{standing.wins}</td><td>{standing.draws}</td><td>{standing.losses}</td>
                      <td>{standing.goals_for}</td><td>{standing.goals_against}</td>
                      <td className={standing.goal_difference > 0 ? 'positive' : standing.goal_difference < 0 ? 'negative' : ''}>{standing.goal_difference > 0 ? '+' : ''}{standing.goal_difference}</td>
                      <td><strong>{standing.points}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!standings.length && <p className="league-empty">Nenhum clube cadastrado.</p>}
            </div>
            <p className="league-table-legend">J: jogos · V: vitórias · E: empates · D: derrotas · GP: gols marcados · GC: gols sofridos · SG: saldo de gols · Pts: pontos</p>
          </section>
          <aside className="league-standings-aside">
            <section className="league-panel league-last-matches">
              <header><h2>Últimas partidas</h2><p>Da mais recente para a mais antiga.</p></header>
              {matches.slice(0, 3).map((match) => {
                const played = dateTime(match.played_at)
                return <div className="league-recent-match" key={match.id}><small>{played.date}, {played.time}</small><p><strong>{match.home_club_name}</strong><MatchScore match={match} compact /><strong>{match.away_club_name}</strong></p></div>
              })}
              {!matches.length && <p className="league-empty compact">Nenhuma partida disputada.</p>}
              <button className="league-all-matches" type="button" onClick={onOpenMatches}>Ver todas as partidas <ArrowRight size={13} /></button>
            </section>
            <section className="league-panel league-ranking-rules">
              <header><h2>Ordem da tabela</h2><p>Critérios de classificação, nesta ordem.</p></header>
              <ol><li><span>1</span>Mais pontos</li><li><span>2</span>Maior saldo de gols</li><li><span>3</span>Mais gols marcados</li><li><span>4</span>Nome do clube, de A a Z</li></ol>
            </section>
          </aside>
        </div>
      )}
      <p className="league-footnote">Classificação de 1 a {standings.length}, com os clubes sem partidas zerados. Pontos, saldo e posição são calculados a cada consulta, nunca gravados.</p>
    </div>
  )
}
