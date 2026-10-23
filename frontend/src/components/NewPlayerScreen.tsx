import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Eye, Info, LockKeyhole, User, X } from 'lucide-react'

import { createPlayer, type Player as ApiPlayer } from '../services/players.service'
import {
  calculateOverall,
  type PlayerPosition,
} from '../lib/player-calculation'
import './NewPlayerScreen.css'

type NewPlayerScreenProps = {
  onCancel: () => void
  onCreated: (player: ApiPlayer) => Promise<void> | void
  onViewDetails: (player: ApiPlayer) => void
}

type AttributeKey =
  | 'pace'
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'defending'
  | 'physical'

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'GOL', label: 'Goleiro' },
  { value: 'ZAG', label: 'Zagueiro' },
  { value: 'LAT', label: 'Lateral' },
  { value: 'MEI', label: 'Meio-campo' },
  { value: 'ATA', label: 'Atacante' },
]

const ATTRIBUTES: { key: AttributeKey; label: string }[] = [
  { key: 'pace', label: 'Ritmo' },
  { key: 'shooting', label: 'Finalização' },
  { key: 'passing', label: 'Passe' },
  { key: 'dribbling', label: 'Drible' },
  { key: 'defending', label: 'Defesa' },
  { key: 'physical', label: 'Físico' },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function parseAttribute(value: string, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return clamp(Math.round(parsed), min, max)
}

export default function NewPlayerScreen({ onCancel, onCreated, onViewDetails }: NewPlayerScreenProps) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState<PlayerPosition>('MEI')
  const [age, setAge] = useState(23)
  const [agility, setAgility] = useState(70)
  const [pace, setPace] = useState(66)
  const [shooting, setShooting] = useState(62)
  const [passing, setPassing] = useState(74)
  const [dribbling, setDribbling] = useState(70)
  const [defending, setDefending] = useState(48)
  const [physical, setPhysical] = useState(58)
  const [potential, setPotential] = useState(82)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdPlayer, setCreatedPlayer] = useState<ApiPlayer | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, submitting])

  const attributes = { pace, shooting, passing, dribbling, defending, physical }
  const attributeValues = Object.values(attributes)
  const attributeSum = attributeValues.reduce((total, value) => total + value, 0)
  const maxAttribute = Math.max(...attributeValues)
  const maxAgility = age >= 35 ? 85 : 100

  const overall = useMemo(
    () => calculateOverall(position, { pace, shooting, passing, dribbling, defending, physical }),
    [position, pace, shooting, passing, dribbling, defending, physical],
  )

  const trimmedName = name.trim().replace(/ {2,}/g, ' ')

  const fieldErrors = useMemo(() => {
    const next: Record<string, string> = {}

    if (trimmedName.length > 0) {
      if (trimmedName.length < 3 || trimmedName.length > 100) {
        next.name = 'O nome deve ter entre 3 e 100 caracteres.'
      } else if (/\d/.test(trimmedName)) {
        next.name = 'O nome não pode conter números.'
      } else if (!trimmedName.includes(' ')) {
        next.name = 'Informe nome e sobrenome.'
      }
    }

    if (age < 16 || age > 45) next.age = 'A idade deve estar entre 16 e 45 anos.'
    if (agility < 1 || agility > maxAgility) {
      next.agility = age >= 35
        ? 'Agilidade máxima para 35 anos ou mais é 85.'
        : 'A agilidade deve estar entre 1 e 100.'
    }
    if (attributeSum > 480) next.attributes = 'A soma dos seis atributos não pode ultrapassar 480.'
    if (potential < maxAttribute) next.potential = 'O potencial deve ser maior ou igual ao maior atributo.'
    if (age >= 33 && potential !== maxAttribute) {
      next.potential = 'Com 33 anos ou mais, o potencial deve ser igual ao maior atributo.'
    }

    return next
  }, [trimmedName, age, agility, maxAgility, attributeSum, potential, maxAttribute])

  const canSubmit = trimmedName.length > 0 && Object.keys(fieldErrors).length === 0 && !submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)

    try {
      const created = await createPlayer({
        name: trimmedName,
        position,
        agility,
        age,
        pace,
        shooting,
        passing,
        dribbling,
        defending,
        physical,
        potential,
      })
      await onCreated(created)
      setCreatedPlayer(created)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível cadastrar o jogador.'
      setError(
        message === 'Failed to fetch'
          ? 'Não foi possível conectar à API. Verifique se o backend está em execução.'
          : message,
      )
    } finally {
      setSubmitting(false)
    }
  }

  function setAttribute(key: AttributeKey, value: number) {
    const setters: Record<AttributeKey, (next: number) => void> = {
      pace: setPace,
      shooting: setShooting,
      passing: setPassing,
      dribbling: setDribbling,
      defending: setDefending,
      physical: setPhysical,
    }
    setters[key](value)
  }

  if (createdPlayer) {
    const createdMoney = (value: number) =>
      value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    return (
      <div className="np-overlay">
        <section className="np-success-modal" role="dialog" aria-modal="true" aria-labelledby="np-success-title">
          <button className="np-close" type="button" aria-label="Fechar" onClick={onCancel}>
            <X size={16} />
          </button>
          <CheckCircle2 className="np-success-icon" size={23} />
          <h1 id="np-success-title">Jogador cadastrado</h1>
          <p className="np-success-description">
            {createdPlayer.name} entrou livre e Apto. Valores em moedas, calculados pela API ao salvar.
          </p>
          <dl className="np-success-values">
            <div className='np-success-baseValue'><dt><strong>Valor base</strong><small>Calculado no cadastro; não muda depois</small></dt><dd>{createdMoney(createdPlayer.base_value)}</dd></div>
            <div><dt><strong>Valor de mercado</strong><small>Com condição, agilidade e idade</small></dt><dd>{createdMoney(createdPlayer.market_value)}</dd></div>
            <div><dt><strong>Overall</strong><small>Pelos pesos da posição {POSITIONS.find((item) => item.value === createdPlayer.position)?.label}</small></dt><dd>{createdPlayer.overall}</dd></div>
          </dl>
          <footer>
            <button className="secondary-button" type="button" onClick={() => onViewDetails(createdPlayer)}><Eye size={13} /> Ver detalhes</button>
            <button className="primary-button" type="button" onClick={onCancel}>Fechar</button>
          </footer>
        </section>
      </div>
    )
  }

  return (
    <div className="np-overlay">
      <form
        className="np-modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="np-title"
      >
        <header className="np-modal-header">
          <div>
            <h1 id="np-title">Novo jogador</h1>
            <p>Preencha os dados e os indicadores técnicos. O valor base, o overall e o valor de mercado são calculados ao salvar.</p>
          </div>
          <button className="np-close" type="button" aria-label="Fechar cadastro" onClick={onCancel} disabled={submitting}>
            <X size={16} />
          </button>
        </header>

        {error && <div className="np-alert">{error}</div>}

        <div className="np-modal-body">
          <div className="np-form-fields">
            <label className="np-field np-name-field">
              <span>Nome</span>
              <span className="np-name-control">
                <User size={14} />
                <input
                  type="text"
                  value={name}
                  placeholder="EX: Davi Melo"
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  autoComplete="off"
                />
              </span>
              <small className={fieldErrors.name ? 'np-error' : undefined}>
                {fieldErrors.name ?? 'De 3 a 100 caracteres, com pelo menos duas palavras e sem números.'}
              </small>
            </label>

            <div className="np-field np-position-field">
              <span>Posição</span>
              <div className="np-positions" role="radiogroup" aria-label="Posição">
                {POSITIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={position === item.value}
                    className={position === item.value ? 'active' : ''}
                    onClick={() => setPosition(item.value)}
                  >
                    <strong>{item.value}</strong>
                    <small>{item.label}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="np-details-grid">
              <label className="np-field">
                <span>Idade</span>
                <input
                  type="number"
                  min={16}
                  max={45}
                  value={age}
                  onChange={(event) => {
                    const nextAge = parseAttribute(event.target.value, 16, 45)
                    setAge(nextAge)
                    if (nextAge >= 35 && agility > 85) setAgility(85)
                  }}
                />
                <small className={fieldErrors.age ? 'np-error' : undefined}>
                  {fieldErrors.age ?? 'De 16 a 45 anos.'}
                </small>
              </label>

              <label className="np-field">
                <span>Agilidade</span>
                <input
                  type="number"
                  min={1}
                  max={maxAgility}
                  value={agility}
                  onChange={(event) => setAgility(parseAttribute(event.target.value, 1, maxAgility))}
                />
                <small className={fieldErrors.agility ? 'np-error' : undefined}>
                  {fieldErrors.agility ?? (age >= 35 ? 'Máximo 85 aos 35+.' : '1 a 100; máx. 85 aos 35+.')}
                </small>
              </label>

              <label className="np-field">
                <span>Valor base (moedas)</span>
                <span className="np-locked-field"><LockKeyhole size={12} /> Após salvar</span>
                <small>Calculado no cadastro.</small>
              </label>
            </div>

            <section className="np-technical-section">
              <header className="np-section-heading">
                <h2>Indicadores técnicos</h2>
                <p>Seis atributos e o potencial, de 1 a 99. A soma dos seis atributos não pode passar de 480.</p>
              </header>

              <div className="np-attribute-grid">
                {ATTRIBUTES.map((item) => (
                  <label className="np-attribute-field" key={item.key}>
                    <span>{item.label}</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={attributes[item.key]}
                      onChange={(event) => setAttribute(item.key, parseAttribute(event.target.value, 1, 99))}
                      aria-label={item.label}
                    />
                  </label>
                ))}
                <label className="np-attribute-field">
                  <span>Potencial</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={potential}
                    onChange={(event) => setPotential(parseAttribute(event.target.value, 1, 99))}
                    aria-label="Potencial"
                  />
                  <small>{age >= 33 ? 'Igual ao maior atributo com 33+ anos.' : 'Maior atributo ou mais.'}</small>
                </label>
                <label className="np-attribute-field np-overall-field">
                  <span>Overall</span>
                  <span className="np-locked-field"><LockKeyhole size={12} /> {overall}</span>
                  <small>Calculado automaticamente.</small>
                </label>
              </div>
              {(fieldErrors.attributes || fieldErrors.potential) && (
                <p className="np-error np-technical-error">{fieldErrors.attributes ?? fieldErrors.potential}</p>
              )}
            </section>
          </div>

          <aside className="np-preview-panel" aria-label="Prévia dos atributos">
            <h2>Prévia dos atributos</h2>
            <div className="np-preview-bars">
              {ATTRIBUTES.map((item) => (
                <div className="np-preview-row" key={item.key}>
                  <span>{item.label}</span>
                  <span className="np-bar"><i style={{ width: `${attributes[item.key]}%` }} /></span>
                  <strong>{attributes[item.key]}</strong>
                </div>
              ))}
            </div>
            <p>Faixa clara: até o potencial ({potential}). A prévia só desenha os valores digitados; não calcula o overall nem o valor base.</p>
          </aside>
        </div>

        <footer className="np-modal-footer">
          <p><Info size={12} /> O jogador começa livre e Apto.</p>
          <div>
            <button type="button" className="secondary-button" onClick={onCancel} disabled={submitting}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={!canSubmit}>
              {submitting ? 'Salvando...' : 'Salvar jogador'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
