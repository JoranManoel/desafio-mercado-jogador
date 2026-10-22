import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Coins,
  History,
  RefreshCw,
  Save,
  Shield,
  Shirt,
  ShoppingCart,
  Trophy,
  Users,
} from 'lucide-react'

import {
  getClubLineup,
  getClubTransactions,
  updateClubLineup,
  type Club,
  type ClubFormation,
  type ClubLineup,
  type ClubTransaction,
} from '../services/clubs.service'
import './ClubScreen.css'

type ClubPlayer = {
  id: number
  name: string
  position: 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA'
  positionName: string
  overall: number
  shooting: number
  passing: number
  defending: number
  age: number
  agility: number
  condition: 'Apto' | 'Mal condicionado' | 'Doente'
  marketValue: number
  baseValue: number
  clubId: number | null
  potential: number
}

type ClubScreenProps = {
  club: Club
  players: ClubPlayer[]
  onBuyPlayers: () => void
  onToast: (toast: { title: string; description: string }) => void
}

type PositionGroup = 'keeper' | 'defense' | 'midfield' | 'attack' | 'flex'

type FormationSlot = {
  label: string
  group: PositionGroup
  x: number
  y: number
}

type FormationOption = {
  value: ClubFormation
  description: string
  slots: FormationSlot[]
}

const FORMATIONS: FormationOption[] = [
  {
    value: '3-1',
    description: 'Defesa 3, ataque 1',
    slots: [
      { label: 'Goleiro', group: 'keeper', x: 50, y: 86 },
      { label: 'Defesa', group: 'defense', x: 22, y: 67 },
      { label: 'Defesa', group: 'defense', x: 50, y: 67 },
      { label: 'Defesa', group: 'defense', x: 78, y: 67 },
      { label: 'Ataque', group: 'flex', x: 50, y: 31 },
    ],
  },
  {
    value: '2-2',
    description: 'Defesa 2, ataque 2',
    slots: [
      { label: 'Goleiro', group: 'keeper', x: 50, y: 86 },
      { label: 'Defesa', group: 'defense', x: 34, y: 67 },
      { label: 'Defesa', group: 'defense', x: 66, y: 67 },
      { label: 'Ataque', group: 'flex', x: 34, y: 35 },
      { label: 'Ataque', group: 'flex', x: 66, y: 35 },
    ],
  },
  {
    value: '2-1-1',
    description: 'Defesa 2, meio 1, ataque 1',
    slots: [
      { label: 'Goleiro', group: 'keeper', x: 50, y: 86 },
      { label: 'Defesa', group: 'defense', x: 34, y: 67 },
      { label: 'Defesa', group: 'defense', x: 66, y: 67 },
      { label: 'Meio', group: 'midfield', x: 50, y: 48 },
      { label: 'Ataque', group: 'attack', x: 50, y: 28 },
    ],
  },
  {
    value: '1-2-1',
    description: 'Defesa 1, meio 2, ataque 1',
    slots: [
      { label: 'Goleiro', group: 'keeper', x: 50, y: 86 },
      { label: 'Defesa', group: 'defense', x: 50, y: 68 },
      { label: 'Meio', group: 'midfield', x: 34, y: 45 },
      { label: 'Meio', group: 'midfield', x: 66, y: 45 },
      { label: 'Ataque', group: 'attack', x: 50, y: 26 },
    ],
  },
]

const POSITION_ORDER: Record<ClubPlayer['position'], number> = {
  GOL: 0,
  ZAG: 1,
  LAT: 2,
  MEI: 3,
  ATA: 4,
}

const money = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function matchesSlot(player: Pick<ClubPlayer, 'position'>, group: PositionGroup) {
  if (group === 'keeper') return player.position === 'GOL'
  if (group === 'defense') return player.position === 'ZAG' || player.position === 'LAT'
  if (group === 'midfield') return player.position === 'MEI'
  if (group === 'attack') return player.position === 'ATA'
  return player.position === 'MEI' || player.position === 'ATA'
}

function restoreSlotIds(players: ClubLineup['players'], formation: ClubFormation) {
  const remaining = [...players]
  const slots = FORMATIONS.find((item) => item.value === formation)?.slots ?? FORMATIONS[2].slots

  return slots.map((slot) => {
    const playerIndex = remaining.findIndex((player) => matchesSlot(player, slot.group))
    if (playerIndex < 0) return null
    return remaining.splice(playerIndex, 1)[0].id
  })
}

function conditionClass(condition: ClubPlayer['condition']) {
  if (condition === 'Apto') return 'fit'
  if (condition === 'Doente') return 'sick'
  return 'poor'
}

export default function ClubScreen({ club, players, onBuyPlayers, onToast }: ClubScreenProps) {
  const [activeTab, setActiveTab] = useState<'Elenco' | 'Escalação' | 'Histórico'>('Escalação')
  const [lineup, setLineup] = useState<Awaited<ReturnType<typeof getClubLineup>> | null>(null)
  const [transactions, setTransactions] = useState<ClubTransaction[] | null>(null)
  const [formation, setFormation] = useState<ClubFormation>('2-1-1')
  const [selectedIds, setSelectedIds] = useState<Array<number | null>>([null, null, null, null, null])
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const roster = useMemo(
    () => players.filter((player) => player.clubId === club.id).sort((a, b) => POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || a.name.localeCompare(b.name, 'pt-BR')),
    [players, club.id],
  )

  useEffect(() => {
    let active = true
    void getClubLineup(club.id)
      .then((response) => {
        if (!active) return
        setLineup(response)
        const savedFormation = response.formation ?? '2-1-1'
        setFormation(savedFormation)
        setSelectedIds(restoreSlotIds(response.players, savedFormation))
      })
      .catch((error: unknown) => {
        if (active) setLoadingError(error instanceof Error ? error.message : 'Não foi possível carregar a escalação.')
      })

    return () => {
      active = false
    }
  }, [club.id])

  useEffect(() => {
    let active = true
    void getClubTransactions(club.id)
      .then((response) => {
        if (active) setTransactions(response)
      })
      .catch((error: unknown) => {
        if (active) setHistoryError(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.')
      })

    return () => {
      active = false
    }
  }, [club.id])

  const currentFormation = FORMATIONS.find((item) => item.value === formation) ?? FORMATIONS[2]
  const playerById = new Map(roster.map((player) => [player.id, player]))
  const selectedPlayers = selectedIds.map((id) => (id === null ? null : playerById.get(id) ?? null))
  const selectedCount = selectedIds.filter((id) => id !== null).length
  const complete = selectedCount === 5 && new Set(selectedIds).size === 5
  const hasSickPlayer = selectedPlayers.some((player) => player?.condition === 'Doente')
  const canSave = complete && !hasSickPlayer && dirty && !saving
  const freeSlots = selectedIds.filter((id) => id === null).length

  async function saveLineup() {
    if (!canSave) return
    setSaving(true)
    setSaveError(null)

    try {
      const response = await updateClubLineup(club.id, formation, selectedIds as number[])
      setLineup(response)
      setDirty(false)
      onToast({ title: 'Escalação salva', description: `A formação ${formation} do ${club.name} foi atualizada.` })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar a escalação.')
    } finally {
      setSaving(false)
    }
  }

  function selectFormation(nextFormation: ClubFormation) {
    if (nextFormation === formation) return
    setFormation(nextFormation)
    setSelectedIds([null, null, null, null, null])
    setDirty(true)
    setSaveError(null)
  }

  function selectPlayer(slotIndex: number, rawId: string) {
    const nextId = rawId ? Number(rawId) : null
    setSelectedIds((previous) => previous.map((id, index) => index === slotIndex ? nextId : id))
    setDirty(true)
    setSaveError(null)
  }

  const warning = hasSickPlayer
    ? 'Jogadores doentes não podem ser titulares. Troque os jogadores indicados antes de salvar.'
    : roster.length < 5
      ? `O elenco tem ${roster.length} jogador${roster.length === 1 ? '' : 'es'}, e a escalação precisa de 5 titulares. Compre jogadores e salve a escalação com os 5 titulares.`
      : freeSlots > 0
        ? `A escalação precisa de 5 titulares. Selecione ${freeSlots} jogador${freeSlots === 1 ? '' : 'es'} para completar a formação.`
        : null

  return (
    <div className="club-screen">
      <header className="club-screen-heading">
        <span className="club-screen-mark">{club.acronym}</span>
        <div className="club-screen-title">
          <h1>{club.name}</h1>
          <div><span>{club.acronym}</span><span><Users size={11} /> {roster.length} de 12 jogadores</span></div>
        </div>
        <button className="primary-button" onClick={onBuyPlayers}><ShoppingCart size={14} /> Comprar jogadores</button>
      </header>

      <section className="club-stat-grid">
        <article><span>Caixa <Coins size={12} /></span><strong>{money(club.cash)} <small>moedas</small></strong><p>Só muda por compras e vendas</p></article>
        <article><span>Valor do elenco <Activity size={12} /></span><strong>{money(club.squad_value)} <small>moedas</small></strong><p>Soma dos valores de mercado</p></article>
        <article><span>Patrimônio <Trophy size={12} /></span><strong>{money(club.net_worth)} <small>moedas</small></strong><p>Caixa + valor do elenco</p></article>
        <article><span>Elenco <Shirt size={12} /></span><strong>{roster.length} de 12</strong><p>Limite de 12 jogadores</p></article>
      </section>

      <nav className="club-tabs" aria-label="Seções do clube">
        <button className={activeTab === 'Elenco' ? 'active' : ''} onClick={() => setActiveTab('Elenco')}><Users size={12} /> Elenco <span>{roster.length}</span></button>
        <button className={activeTab === 'Escalação' ? 'active' : ''} onClick={() => setActiveTab('Escalação')}><Shield size={12} /> Escalação <span>{lineup?.total_players ?? 0}</span></button>
        <button className={activeTab === 'Histórico' ? 'active' : ''} onClick={() => setActiveTab('Histórico')}><History size={12} /> Histórico <span>{transactions?.length ?? '…'}</span></button>
      </nav>

      {activeTab === 'Escalação' && (
        <div className="club-lineup-view">
          {warning && (
            <div className="club-lineup-warning"><AlertTriangle size={13} /><div><strong>Escalação incompleta: o {club.name} não pode jogar partidas</strong><p>{warning}</p></div></div>
          )}
          {loadingError && <div className="club-lineup-error">{loadingError}</div>}
          {saveError && <div className="club-lineup-error">{saveError}</div>}

          <div className="club-lineup-grid">
            <section className="club-lineup-panel">
              <header className="club-panel-heading"><div><h2>Titulares</h2><p>1 goleiro e 4 jogadores de linha, na formação escolhida. Salvar troca os 5 de uma vez.</p></div><span className={complete && !hasSickPlayer ? 'club-lineup-status ready' : 'club-lineup-status'}>{complete && !hasSickPlayer ? 'Completa' : 'Incompleta'}</span></header>

              <div className="club-formation-heading"><div><h3>Formação</h3><p>Os números contam com jogadores de linha para frente. O goleiro fica fora da conta.</p></div></div>
              <div className="club-formation-options">
                {FORMATIONS.map((option, index) => (
                  <button key={option.value} className={formation === option.value ? 'active' : ''} onClick={() => selectFormation(option.value)}>
                    <span className={`club-mini-pitch club-mini-${index}`}><i /><b /><em /></span>
                    <span><strong>{option.value}</strong><small>{option.description}</small></span>
                  </button>
                ))}
              </div>

              <div className="club-lineup-table-head"><span>Vaga</span><span>Titular</span><span>Condição</span><span>Overall</span><span>Atributos usados</span></div>
              <div className="club-lineup-rows">
                {currentFormation.slots.map((slot, index) => {
                  const selected = selectedPlayers[index]
                  const occupiedElsewhere = new Set(selectedIds.filter((_, idIndex) => idIndex !== index && selectedIds[idIndex] !== null))
                  const candidates = roster.filter((candidate) => matchesSlot(candidate, slot.group))
                  const attribute = selected
                    ? slot.group === 'keeper'
                      ? `Defesa ${selected.defending}`
                      : slot.group === 'defense'
                        ? `Defesa ${selected.defending}`
                        : slot.group === 'midfield'
                          ? `Passe ${selected.passing}`
                          : `Finalização ${selected.shooting}`
                    : '—'

                  return (
                    <div className="club-lineup-row" key={`${formation}-${index}`}>
                      <div className="club-lineup-slot"><strong>{slot.label}</strong><small>{slot.group === 'defense' ? 'ZAG ou LAT' : slot.group === 'midfield' ? 'MEI' : slot.group === 'attack' ? 'ATA' : slot.group === 'flex' ? 'MEI ou ATA' : 'GOL'}</small></div>
                      <label className="club-player-select"><select aria-label={`${slot.label} titular ${index + 1}`} value={selectedIds[index] ?? ''} onChange={(event) => selectPlayer(index, event.target.value)}>
                        <option value="">{candidates.length ? `Selecione ${slot.label.toLocaleLowerCase('pt-BR')}` : `Sem ${slot.group === 'defense' ? 'ZAG ou LAT' : slot.group === 'keeper' ? 'goleiro' : slot.group === 'midfield' ? 'MEI' : slot.group === 'attack' ? 'ATA' : 'MEI ou ATA'} no elenco`}</option>
                        {candidates.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={occupiedElsewhere.has(candidate.id) || candidate.condition === 'Doente'}>{candidate.name} ({candidate.position}){candidate.condition === 'Doente' ? ' · Doente' : ''}</option>)}
                      </select><ChevronDown size={11} /></label>
                      <span className={`condition condition-${selected ? conditionClass(selected.condition) : 'empty'}`}><i />{selected?.condition ?? '—'}</span>
                      <strong className="club-lineup-overall">{selected?.overall ?? '—'}</strong>
                      <span className="club-lineup-attribute">{attribute}</span>
                    </div>
                  )
                })}
              </div>

              <footer className="club-lineup-footer"><span>{dirty ? 'Alterações não salvas.' : lineup?.total_players === 5 ? `Formação ${lineup.formation} salva.` : 'Escolha a formação e um titular para cada vaga.'}</span><div><button className="secondary-button" disabled={!dirty || saving} onClick={() => { const savedFormation = lineup?.formation ?? '2-1-1'; setFormation(savedFormation); setSelectedIds(restoreSlotIds(lineup?.players ?? [], savedFormation)); setDirty(false); setSaveError(null) }}>Cancelar</button><button className="primary-button" disabled={!canSave} onClick={() => void saveLineup()}>{saving ? <RefreshCw size={12} className="club-spin" /> : <Save size={12} />} Salvar escalação</button></div></footer>
            </section>

            <aside className="club-lineup-aside">
              <section className="club-pitch-card"><header><h2>Em campo</h2><small>Prévia da formação {formation}: as vagas vazias ficam tracejadas.</small></header>
                <div className="club-pitch">
                  <div className="club-pitch-center" />
                  <div className="club-pitch-box club-pitch-box-top" />
                  <div className="club-pitch-box club-pitch-box-bottom" />
                  {currentFormation.slots.map((slot, index) => {
                    const selected = selectedPlayers[index]
                    return <div className={`club-pitch-player ${selected ? 'filled' : ''} ${selected?.condition === 'Doente' ? 'sick' : ''}`} key={`${formation}-pitch-${index}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}><span>{selected ? initials(selected.name) : '+'}</span><small>{selected?.name.split(' ').slice(-1)[0] ?? slot.label}</small></div>
                  })}
                </div>
                <p className="club-pitch-note"><Activity size={11} /> Na partida, os jogadores de linha mais habilidosos de cada formação influenciam o ataque e a defesa.</p>
              </section>
              <section className="club-reserve-card"><header><h2>Reservas</h2><small>Jogadores do elenco fora da escalação.</small></header>
                {roster.filter((player) => !selectedIds.includes(player.id)).length === 0
                  ? <p>Nenhuma reserva: todos do elenco estão selecionados.</p>
                  : <div>{roster.filter((player) => !selectedIds.includes(player.id)).map((player) => <span key={player.id}>{initials(player.name)} {player.name} <small>{player.position}</small></span>)}</div>}
              </section>
            </aside>
          </div>
          <p className="club-lineup-note">{dirty
            ? `A escalação salva continua ativa até salvar estas alterações. Sem os 5 titulares, o ${club.name} não pode jogar partidas.`
            : lineup?.total_players === 5
              ? `A escalação ${lineup.formation} do ${club.name} está salva. Jogadores doentes não podem participar das partidas.`
              : `O ${club.name} ainda não tem escalação salva. Sem os 5 titulares, não pode jogar partidas. O botão Salvar só é liberado com uma formação completa e um titular em cada uma das 5 vagas.`}</p>
        </div>
      )}

      {activeTab === 'Elenco' && (
        <section className="club-roster-panel"><header className="club-panel-heading"><div><h2>Elenco</h2><p>{roster.length} jogador{roster.length === 1 ? '' : 'es'} contratado{roster.length === 1 ? '' : 's'} pelo {club.name}.</p></div><button className="primary-button" onClick={onBuyPlayers}><ShoppingCart size={13} /> Comprar jogadores</button></header>
          <div className="club-table-scroll"><table className="club-data-table"><thead><tr><th>Jogador</th><th>Posição</th><th>Overall</th><th>Agilidade</th><th>Idade</th><th>Condição</th><th>Valor de mercado</th></tr></thead><tbody>{roster.map((player) => <tr key={player.id}><td><span className="club-roster-avatar">{initials(player.name)}</span><strong>{player.name}</strong></td><td>{player.position}</td><td>{player.overall}</td><td>{player.agility}</td><td>{player.age}</td><td><span className={`condition condition-${conditionClass(player.condition)}`}><i />{player.condition}</span></td><td>{money(player.marketValue)}</td></tr>)}</tbody></table>{roster.length === 0 && <p className="club-empty-state">O elenco está vazio. Compre jogadores para montar o time.</p>}</div>
        </section>
      )}

      {activeTab === 'Histórico' && (
        <section className="club-roster-panel"><header className="club-panel-heading"><div><h2>Histórico</h2><p>Compras e vendas registradas para o {club.name}.</p></div></header>
          {historyError && <p className="club-lineup-error">{historyError}</p>}
          {!transactions && !historyError ? <p className="club-empty-state">Carregando transações...</p> : transactions?.length
            ? <div className="club-table-scroll"><table className="club-data-table"><thead><tr><th>Data</th><th>Jogador</th><th>Operação</th><th>Valor</th><th>Taxa</th><th>Variação do caixa</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id}><td>{new Date(transaction.created_at).toLocaleDateString('pt-BR')}</td><td>{transaction.player_name}</td><td><span className={`club-transaction-type ${transaction.type === 'COMPRA' ? 'purchase' : 'sale'}`}>{transaction.type === 'COMPRA' ? 'Compra' : 'Venda'}</span></td><td>{money(transaction.value)}</td><td>{money(transaction.fee)}</td><td className={transaction.cash_change < 0 ? 'club-cash-negative' : 'club-cash-positive'}>{transaction.cash_change < 0 ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}{money(transaction.cash_change)}</td></tr>)}</tbody></table></div>
            : <p className="club-empty-state">Nenhuma transação registrada para este clube.</p>}
        </section>
      )}
    </div>
  )
}