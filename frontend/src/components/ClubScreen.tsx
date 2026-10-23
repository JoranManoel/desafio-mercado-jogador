import { useEffect, useMemo, useState } from 'react'
import {
    Activity,
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    ChevronDown,
    ClipboardList,
    Coins,
    Download,
    HandCoins,
    History,
    Landmark,
    RefreshCw,
    Save,
    Shirt,
    ShoppingCart,
    Users,
    Wallet,
} from 'lucide-react'

import {
    getClubLineup,
    getClubRosterContracts,
    getClubTransactions,
    downloadClubTransactionsCsv,
    updateClubLineup,
    type Club,
    type ClubFormation,
    type ClubLineup,
    type ClubRosterContract,
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
    onSellPlayer: (playerId: number) => void
    historyRefreshKey: number
    initialTab: 'Elenco' | 'Escalação' | 'Histórico'
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

function ClubRosterAvatar({ player }: { player: ClubPlayer }) {
    const [colorIndex] = useState(() => Math.floor(Math.random() * 6))

    return <span className={`club-roster-avatar avatar-${colorIndex}`}>{initials(player.name)}</span>
}

export default function ClubScreen({ club, players, onBuyPlayers, onSellPlayer, historyRefreshKey, initialTab, onToast }: ClubScreenProps) {
    const [activeTab, setActiveTab] = useState<'Elenco' | 'Escalação' | 'Histórico'>(initialTab)
    const [lineup, setLineup] = useState<Awaited<ReturnType<typeof getClubLineup>> | null>(null)
    const [rosterContracts, setRosterContracts] = useState<{ clubId: number; contracts: Map<number, ClubRosterContract | null>; error: string | null } | null>(null)
    const [transactions, setTransactions] = useState<ClubTransaction[] | null>(null)
    const [historyTypes, setHistoryTypes] = useState({ COMPRA: true, VENDA: true })
    const [historyPlayerId, setHistoryPlayerId] = useState('')
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
        void getClubRosterContracts(club.id)
            .then((response) => {
                if (active) {
                    setRosterContracts({
                        clubId: club.id,
                        contracts: new Map(response.players.map((player) => [player.id, player.contract])),
                        error: null,
                    })
                }
            })
            .catch((error: unknown) => {
                if (active) {
                    setRosterContracts({
                        clubId: club.id,
                        contracts: new Map(),
                        error: error instanceof Error ? error.message : 'Não foi possível carregar os contratos do elenco.',
                    })
                }
            })

        return () => {
            active = false
        }
    }, [club.id])

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
                if (active) {
                    setTransactions(response)
                    setHistoryError(null)
                }
            })
            .catch((error: unknown) => {
                if (active) setHistoryError(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.')
            })

        return () => {
            active = false
        }
    }, [club.id, historyRefreshKey])

    const currentFormation = FORMATIONS.find((item) => item.value === formation) ?? FORMATIONS[2]
    const currentRosterContracts = rosterContracts?.clubId === club.id ? rosterContracts : null
    const playerById = new Map(roster.map((player) => [player.id, player]))
    const selectedPlayers = selectedIds.map((id) => (id === null ? null : playerById.get(id) ?? null))
    const selectedCount = selectedIds.filter((id) => id !== null).length
    const complete = selectedCount === 5 && new Set(selectedIds).size === 5
    const hasSickPlayer = selectedPlayers.some((player) => player?.condition === 'Doente')
    const canSave = complete && !hasSickPlayer && dirty && !saving
    const freeSlots = selectedIds.filter((id) => id === null).length
    const historyPlayers = useMemo(() => {
        const uniquePlayers = new Map<number, string>()
        for (const transaction of transactions ?? []) uniquePlayers.set(transaction.player_id, transaction.player_name)
        return [...uniquePlayers].sort((first, second) => first[1].localeCompare(second[1], 'pt-BR'))
    }, [transactions])
    const filteredTransactions = useMemo(() => (transactions ?? []).filter((transaction) =>
        historyTypes[transaction.type] && (!historyPlayerId || transaction.player_id === Number(historyPlayerId)),
    ), [transactions, historyTypes, historyPlayerId])
    const historyTotals = useMemo(() => filteredTransactions.reduce((totals, transaction) => {
        const value = Math.round(transaction.value * 100)
        const fee = Math.round(transaction.fee * 100)
        const penalty = Math.round(transaction.penalty * 100)

        if (transaction.type === 'COMPRA') totals.purchases += value + fee
        if (transaction.type === 'VENDA') {
            totals.sales += Math.round(transaction.cash_change * 100)
            totals.profit += Math.round((transaction.profit ?? 0) * 100)
        }
        totals.fees += fee
        totals.penalties += penalty
        return totals
    }, { purchases: 0, sales: 0, fees: 0, penalties: 0, profit: 0 }), [filteredTransactions])

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

    async function exportHistory() {
        const types: string[] = []
        if (historyTypes.COMPRA) types.push('COMPRA')
        if (historyTypes.VENDA) types.push('VENDA')
        const typeParam = types.length === 1 ? types[0] : undefined
        const playerIdParam = historyPlayerId ? Number(historyPlayerId) : undefined

        try {
            const blob = await downloadClubTransactionsCsv(club.id, typeParam, playerIdParam)
            const objectUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = objectUrl
            link.download = `historico-${club.acronym.toLowerCase()}.csv`
            link.click()
            URL.revokeObjectURL(objectUrl)
            onToast({ title: 'CSV baixado', description: `historico-${club.acronym.toLowerCase()}.csv, com os filtros aplicados.` })
        } catch (err) {
            onToast({ title: 'Erro ao baixar CSV', description: err instanceof Error ? err.message : 'Falha na exportação.' })
        }
    }

    function clearHistoryFilters() {
        setHistoryTypes({ COMPRA: true, VENDA: true })
        setHistoryPlayerId('')
    }

    const hasHistoryFilters = !historyTypes.COMPRA || !historyTypes.VENDA || Boolean(historyPlayerId)

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
                    <div><span>Sigla {club.acronym}</span><span><Users size={11} /> {roster.length} de 12 jogadores</span></div>
                </div>
                <button className="primary-button" onClick={onBuyPlayers}><ShoppingCart size={14} /> Comprar jogadores</button>
            </header>

            <section className="club-stat-grid">
                <article><span>Caixa <Wallet size={12} /></span><strong>{money(club.cash)} <small>moedas</small></strong><p>Só muda por compras e vendas</p></article>
                <article><span>Valor do elenco <Coins size={12} /></span><strong>{money(club.squad_value)} <small>moedas</small></strong><p>Soma dos valores de mercado</p></article>
                <article><span>Patrimônio <Landmark size={12} /></span><strong>{money(club.net_worth)} <small>moedas</small></strong><p>Caixa + valor do elenco</p></article>
                <article><span>Elenco <Shirt size={12} /></span><strong>{roster.length} de 12</strong><p>Limite de 12 jogadores</p></article>
            </section>

            <nav className="club-tabs" aria-label="Seções do clube">
                <button className={activeTab === 'Elenco' ? 'active' : ''} onClick={() => setActiveTab('Elenco')}><Shirt size={12} /> Elenco <span>{roster.length}</span></button>
                <button className={activeTab === 'Escalação' ? 'active' : ''} onClick={() => setActiveTab('Escalação')}><ClipboardList size={12} /> Escalação</button>
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

                            <footer className="club-lineup-footer">
                                <span>
                                    {dirty ? 'Alterações não salvas.' : lineup?.total_players === 5 ? `Formação ${lineup.formation} salva.` : 'Escolha a formação e um titular para cada vaga.'}
                                </span>
                                <div>
                                    <button className="secondary-button" disabled={!dirty || saving} onClick={() => { const savedFormation = lineup?.formation ?? '2-1-1'; setFormation(savedFormation); setSelectedIds(restoreSlotIds(lineup?.players ?? [], savedFormation)); setDirty(false); setSaveError(null) }}>
                                        Cancelar
                                    </button>
                                    <button className="primary-button" disabled={!canSave} onClick={() => void saveLineup()}>{saving ? <RefreshCw size={12} className="club-spin" /> : <Save size={12} />}
                                        Salvar escalação
                                    </button>
                                </div>
                            </footer>
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
                <section className="club-roster-panel">
                    {roster.length === 0 ? (
                        <div className="club-empty-state">
                            <Shirt size={12} />
                            <h3>Nenhum jogador no elenco</h3>
                            <p>Compre jogadores livres para montar o elenco. O limite é de 12</p>
                            <p>jogadores, e o custo de cada compra não pode passar de 50% do valor do caixa.</p>
                            <button className="" onClick={onBuyPlayers}><Users size={10} /> Ver jogadores livres</button>

                        </div>
                    ) :
                        <div>
                            <header className="club-panel-heading">
                                <div>
                                    <h2>Elenco</h2>
                                    <p>{roster.length} jogador{roster.length === 1 ? '' : 'es'} contratado{roster.length === 1 ? '' : 's'} pelo {club.name}.</p>
                                </div>
                            </header>
                            {currentRosterContracts?.error && <p className="club-lineup-error club-roster-error" role="alert">{currentRosterContracts.error}</p>}
                            <div className="club-table-scroll">
                                <table className="club-data-table club-roster-table">
                                    <thead>
                                        <tr>
                                            <th>Jogador</th><th>Posição</th><th>Overall</th><th>Condição</th><th>Valor de mercado</th><th>Valor da compra</th><th>Fim da fidelidade</th><th>Dias restantes</th><th>% de multa</th><th>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roster.map((player) => {
                                            const contract = currentRosterContracts?.contracts.get(player.id)
                                            const loyaltyDate = contract
                                                ? new Intl.DateTimeFormat('pt-BR', {
                                                    timeZone: 'America/Sao_Paulo',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                }).format(new Date(contract.loyalty_until))
                                                : null

                                            return <tr key={player.id}>
                                                <td>
                                                    <ClubRosterAvatar player={player} />
                                                    <strong>{player.name}</strong>
                                                </td>
                                                <td><span className="position-pill">{player.position}</span></td>
                                                <td>{player.overall}</td>
                                                <td>
                                                    <span className={`condition condition-${conditionClass(player.condition)}`}><i />{player.condition}</span>
                                                </td>
                                                <td>{money(player.marketValue)}</td>
                                                <td>{contract ? money(contract.purchase_value) : currentRosterContracts ? '—' : '...'}</td>
                                                <td>{loyaltyDate ?? (currentRosterContracts ? '—' : '...')}</td>
                                                <td>{contract ? contract.remaining_days : currentRosterContracts ? '—' : '...'}</td>
                                                <td>{contract
                                                    ? <span className={`condition condition-${contract.penalty_rate === 0 ? 'fit' : contract.penalty_rate <= 10 ? 'poor' : 'sick'}`}>{contract.penalty_rate}%</span>
                                                    : currentRosterContracts ? '—' : '...'}</td>
                                                <td><button className="club-sell-button" type="button" onClick={() => onSellPlayer(player.id)}><HandCoins size={11} /> Vender</button></td>
                                            </tr>
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    }

                </section>
            )}

            {activeTab === 'Histórico' && (
                <section className="club-history-panel">
                    <header className="club-history-heading">
                        <div><h2>Histórico de transações</h2><p>Da mais recente para a mais antiga, com o nome e os valores do momento de cada operação.</p></div>
                        <button className="secondary-button club-export-button" onClick={exportHistory}><Download size={12} /> Exportar CSV</button>
                    </header>

                    <div className="club-history-filters">
                        <span>Tipo</span>
                        <label><input type="checkbox" checked={historyTypes.COMPRA} onChange={(event) => setHistoryTypes((current) => ({ ...current, COMPRA: event.target.checked }))} /> Compra</label>
                        <label><input type="checkbox" checked={historyTypes.VENDA} onChange={(event) => setHistoryTypes((current) => ({ ...current, VENDA: event.target.checked }))} /> Venda</label>
                        <label className="club-history-player-filter"><Users size={12} /><select value={historyPlayerId} onChange={(event) => setHistoryPlayerId(event.target.value)}><option value="">Jogador: todos</option>{historyPlayers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><ChevronDown size={11} /></label>
                        {hasHistoryFilters && <button className="club-history-clear" onClick={clearHistoryFilters}>Limpar filtros</button>}
                    </div>

                    {historyError && <p className="club-lineup-error">{historyError}</p>}
                    {!transactions && !historyError ? <p className="club-empty-state">Carregando transações...</p> : (
                        <>
                            {filteredTransactions.length > 0 ? (
                                <div className="club-table-scroll club-history-table-scroll">
                                    <table className="club-data-table club-history-table"><thead><tr><th>Data e hora</th><th>Tipo</th><th>Jogador</th><th>Valor</th><th>Taxa ou comissão</th><th>Multa</th><th>Lucro</th><th>Variação do caixa</th></tr></thead>
                                        <tbody>{filteredTransactions.map((transaction) => (
                                            <tr key={transaction.id}>
                                                <td>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(transaction.created_at))}<small>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(transaction.created_at))}</small></td>
                                                <td><span className={`club-transaction-type ${transaction.type === 'COMPRA' ? 'purchase' : 'sale'}`}>{transaction.type === 'COMPRA' ? <><ShoppingCart size={9} /> Compra</> : <><ArrowUpRight size={9} /> Venda</>}</span></td>
                                                <td><span className="club-history-player"><span>{initials(transaction.player_name)}</span>{transaction.player_name}</span></td>
                                                <td>{money(transaction.value)}</td>
                                                <td>{money(transaction.fee)}</td>
                                                <td>{money(transaction.penalty)}</td>
                                                <td className={transaction.profit === null ? '' : transaction.profit < 0 ? 'club-cash-negative' : 'club-cash-positive'}>{transaction.profit === null ? '—' : `${transaction.profit > 0 ? '+' : ''}${money(transaction.profit)}`}</td>
                                                <td className={transaction.cash_change < 0 ? 'club-cash-negative' : 'club-cash-positive'}>{transaction.cash_change > 0 ? '+' : ''}{money(transaction.cash_change)}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            ) : <p className="club-empty-state">Nenhuma transação corresponde aos filtros.</p>}

                            <div className="club-history-totals">
                                <article><span><ShoppingCart size={11} /> Total pago em compras</span><strong>{money(historyTotals.purchases / 100)}</strong><small>Valor + taxa</small></article>
                                <article><span><ArrowDownLeft size={11} /> Total recebido em vendas</span><strong>{money(historyTotals.sales / 100)}</strong><small>Crédito líquido</small></article>
                                <article><span><Coins size={11} /> Taxas e comissões</span><strong>{money(historyTotals.fees / 100)}</strong><small>Somadas</small></article>
                                <article><span><AlertTriangle size={11} /> Multas</span><strong>{money(historyTotals.penalties / 100)}</strong><small>Por fidelidade</small></article>
                                <article><span><ArrowUpRight size={11} /> Lucro total</span><strong className={historyTotals.profit < 0 ? 'club-cash-negative' : 'club-cash-positive'}>{historyTotals.profit > 0 ? '+' : ''}{money(historyTotals.profit / 100)}</strong><small>Soma dos lucros, com sinal</small></article>
                            </div>
                        </>
                    )}
                    <p className="club-history-note">O CSV usa os mesmos filtros da tela. Os valores preservam o registro histórico de cada operação.</p>
                </section>
            )}
        </div>
    )
}