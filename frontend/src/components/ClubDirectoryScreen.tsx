import { useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowUpDown, ChevronDown, ChevronRight, Plus, Shield, Wallet, X } from 'lucide-react'

import { createClub, type Club } from '../services/clubs.service'
import './ClubDirectoryScreen.css'

type ClubDirectoryScreenProps = {
    clubs: Club[]
    loading: boolean
    error: string | null
    onCreated: () => Promise<void>
    onSelectClub: (name: string) => void
    onToast: (toast: { title: string; description: string }) => void
}

const money = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function ClubDirectoryScreen({
    clubs,
    loading,
    error,
    onCreated,
    onSelectClub,
    onToast,
}: ClubDirectoryScreenProps) {
    const [sort, setSort] = useState<'name' | 'worth-desc' | 'worth-asc'>('name')
    const [modalOpen, setModalOpen] = useState(false)
    const [name, setName] = useState('')
    const [acronym, setAcronym] = useState('')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const sortedClubs = useMemo(() => [...clubs].sort((first, second) => {
        if (sort === 'worth-desc') return second.net_worth - first.net_worth || first.name.localeCompare(second.name, 'pt-BR')
        if (sort === 'worth-asc') return first.net_worth - second.net_worth || first.name.localeCompare(second.name, 'pt-BR')
        return first.name.localeCompare(second.name, 'pt-BR')
    }), [clubs, sort])

    const clubCount = clubs.length
    const normalizedName = name.trim().replace(/\s+/g, ' ')
    const nameWords = normalizedName.split(' ').filter(Boolean)
    const foldedName = normalizedName.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()
    const acronymMatchesName = [...acronym].reduce((cursor, letter) => {
        if (cursor < 0) return -1
        const nextIndex = foldedName.indexOf(letter, cursor)
        return nextIndex < 0 ? -1 : nextIndex + 1
    }, 0) > 0
    const validName = normalizedName.length >= 3
        && normalizedName.length <= 60
        && nameWords.length >= 2
        && nameWords.length <= 5
        && /^[\p{L} .-]+$/u.test(normalizedName)
    const canCreate = validName && /^[A-Z]{3}$/.test(acronym) && acronym[0] === foldedName[0] && new Set(acronym).size > 1 && acronymMatchesName && !saving

    async function submitClub(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!canCreate) return

        setSaving(true)
        setFormError(null)

        try {
            const created = await createClub({ name: normalizedName, acronym })
            await onCreated()
            setModalOpen(false)
            setName('')
            setAcronym('')
            onToast({ title: 'Clube criado', description: `${created.name} (${created.acronym}) começa com 300,00 em caixa.` })
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Não foi possível cadastrar o clube.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="club-directory">
            <header className="club-directory-heading">
                <div className="club-directory-icon"><Shield size={19} /></div>
                <div className="club-directory-title">
                    <h1>Clubes</h1>
                    <p>Cada clube começa com 300,00 em caixa e sem jogadores. A liga aceita no máximo 20 clubes.</p>
                </div>
                <button className="primary-button" onClick={() => { setFormError(null); setModalOpen(true) }} disabled={clubs.length >= 20}>
                    <Plus size={14} /> Novo clube
                </button>
            </header>

            <section className="club-directory-panel">
                <header className="club-directory-toolbar">
                    <div><h2>{clubCount} clubes</h2><span>{clubCount} de 20</span></div>
                    <label className="club-directory-sort"><ArrowUpDown size={13} /><span>Ordenar:</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="name">nome</option><option value="worth-desc">patrimônio (maior)</option><option value="worth-asc">patrimônio (menor)</option></select><ChevronDown size={12} /></label>
                </header>

                {error && <p className="club-directory-error">{error}</p>}
                {loading ? <p className="club-directory-empty">Carregando clubes...</p> : sortedClubs.length > 0 ? (
                    <div className="club-directory-table-scroll">
                        <table className="club-directory-table">
                            <thead><tr><th>Clube</th><th>Sigla</th><th>Caixa</th><th>Valor do elenco</th><th>Patrimônio</th><th></th></tr></thead>
                            <tbody>
                                {sortedClubs.map((club) => (
                                    <tr key={club.id} onClick={() => onSelectClub(club.name)}>
                                        <td className="club-directory-name-cell">
                                            <span className='club-mark'>{club.acronym}</span>
                                            <strong className="club-directory-club-name">{club.name}</strong>
                                        </td>
                                        <td><span className="position-pill club-acronym-pill">{club.acronym}</span></td>
                                        <td>{money(club.cash)} <small>moedas</small></td>
                                        <td>{money(club.squad_value)} <small>moedas</small></td>
                                        <td className="club-directory-worth">{money(club.net_worth)} <small>moedas</small></td>
                                        <td><button className="club-open-link" onClick={(event) => { event.stopPropagation(); onSelectClub(club.name) }}>Ver clube <ChevronRight size={13} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="club-directory-empty">Nenhum clube cadastrado.</p>
                )}
            </section>

            {modalOpen && (
                <div className="player-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false) }}>
                    <section className="player-action-dialog club-create-dialog" role="dialog" aria-modal="true" aria-labelledby="club-create-title">
                        <header>
                            <div><h2 id="club-create-title">Novo clube</h2><p>Informe o nome e a sigla do clube.</p></div>
                            <button className="icon-button tiny" type="button" aria-label="Fechar" onClick={() => setModalOpen(false)} disabled={saving}><X size={16} /></button>
                        </header>
                        <form onSubmit={(event) => void submitClub(event)}>
                            {formError && <div className="club-create-error"><AlertCircle size={13} /><div><strong>Não foi possível criar o clube</strong><p>{formError}</p></div></div>}
                            <div className="club-create-fields">
                                <label>Nome<span className={`club-create-input ${formError ? 'has-error' : ''}`}><Shield size={12} /><input required minLength={3} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Águias FC" /></span><small>De 3 a 60 caracteres e de 2 a 5 palavras; só letras, espaços, hífen e ponto. Não pode repetir outro clube.</small></label>
                                <label>Sigla<span className={`club-create-acronym ${formError ? 'has-error' : ''}`}><input required minLength={3} maxLength={3} value={acronym} onChange={(event) => setAcronym(event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} placeholder="AGU" /></span><small>3 letras de A a Z, maiúsculas, que aparecem no nome nessa ordem; a primeira deve ser a inicial do nome.</small></label>
                                <p className="club-create-cash-note"><Wallet size={12} /> O clube começa com 300,00 em caixa e sem jogadores.</p>
                            </div>
                            <footer>
                                <button className="secondary-button" type="button" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                                <button className="primary-button" type="submit" disabled={!canCreate}>{saving ? 'Criando...' : 'Criar clube'}</button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}
        </div>
    )
}