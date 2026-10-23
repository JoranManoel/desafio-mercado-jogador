import {
  Users,
  Shield,
  ShoppingCart,
  HandCoins,
  History,
  Trophy,
  ArrowRight,
  UserRound,
  Clock3,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

import './HomeScreen.css'
import type { Standing } from '../services/clubs.service'

type HomeScreenProps = {
  totalPlayers: number
  freePlayers: number
  totalClubs: number
  totalMatches: number
  matchCountError?: string | null
  leagueLeader: Standing | null
  leaderError?: string | null
  onStart: () => void
}

const steps: {
  number: string
  title: string
  description: string
  icon: LucideIcon
}[] = [
  {
    number: '01',
    title: 'Jogadores',
    description:
      'Cadastre jogadores e acompanhe sua condição, seus atributos e seu valor de mercado.',
    icon: Users,
  },
  {
    number: '02',
    title: 'Clubes',
    description:
      'Gerencie os clubes, seu caixa e os jogadores de cada equipe.',
    icon: Shield,
  },
  {
    number: '03',
    title: 'Compra',
    description:
      'Negocie jogadores livres e respeite as regras de caixa e fidelidade.',
    icon: ShoppingCart,
  },
  {
    number: '04',
    title: 'Venda',
    description:
      'Negocie jogadores e acompanhe multas, comissões e movimentações financeiras.',
    icon: HandCoins,
  },
  {
    number: '05',
    title: 'Histórico',
    description:
      'Consulte as transações realizadas e exporte os registros em CSV.',
    icon: History,
  },
  {
    number: '06',
    title: 'Liga',
    description:
      'Monte a escalação, dispute partidas e acompanhe a classificação.',
    icon: Trophy,
  },
]

export default function HomeScreen({
  totalPlayers,
  freePlayers,
  totalClubs,
  totalMatches,
  matchCountError,
  leagueLeader,
  leaderError,
  onStart,
}: HomeScreenProps) {
  return (
    <main className="home-page">
      <section className="home-shell">
        <div className="home-pitch" aria-hidden="true">
          <span className="pitch-center-circle" />
          <span className="pitch-center-line" />
          <span className="pitch-goal pitch-goal-left" />
          <span className="pitch-goal pitch-goal-right" />
          <span className="pitch-penalty pitch-penalty-left" />
          <span className="pitch-penalty pitch-penalty-right" />
        </div>

        <header className="home-brand">
          <div className="home-logo">
            <span>p</span>
          </div>

          <span className="home-brand-name">Passe</span>
        </header>

        <div className="home-league-pill">
          <span className="home-status-dot" />
          <strong>Liga Fictícia 2026</strong>
          <span className="home-pill-divider">·</span>
          {totalMatches === 0 ? (
            <span>Nenhuma partida ainda</span>
          ) : leagueLeader ? (
            <span className="home-leader">
              Líder: <strong>{leagueLeader.club_name}</strong> · {leagueLeader.points} pts
            </span>
          ) : (
            <span>{leaderError ? 'Classificação indisponível' : 'Carregando líder...'}</span>
          )}
        </div>

        <section className="home-hero">
          <h1>Gestão da liga, do mercado à classificação</h1>

          <p>
            Cadastre jogadores, monte os clubes e negocie com contrato de
            fidelidade. Depois, escale os titulares e jogue partidas com placar
            calculado pelos atributos.
          </p>

          <div className="home-start-row">
            <button className="home-start-button" onClick={onStart}>
              Iniciar
              <ArrowRight size={17} />
            </button>

            <span className="home-key-hint">
              ou tecle <kbd>Enter</kbd>
            </span>
          </div>

          <div className="home-stats">
            <span>
              <Users size={13} />
              <strong>{totalPlayers}</strong> jogadores
            </span>

            <i />

            <span>
              <UserRound size={13} />
              <strong>{freePlayers}</strong> livres
            </span>

            <i />

            <span>
              <Shield size={13} />
              <strong>{totalClubs}</strong> clubes
            </span>

            <i />

            <span>
              <Trophy size={13} />
              <strong>{totalMatches}</strong> partidas
            </span>

            <i />

            <span>
              <CheckCircle2 size={13} />
              Não precisa de login
            </span>
          </div>
          {matchCountError && <p className="home-error" role="alert">Não foi possível carregar a quantidade de partidas: {matchCountError}</p>}
          {leaderError && totalMatches > 0 && <p className="home-error" role="alert">Não foi possível carregar o líder da liga: {leaderError}</p>}
        </section>

        <nav className="home-steps" aria-label="Etapas da liga">
          {steps.map((step) => {
            const StepIcon = step.icon

            return (
              <article className="home-step-card" key={step.number}>
                <div className="home-step-heading">
                  <span className="home-step-icon">
                    <StepIcon size={16} />
                  </span>

                  <span className="home-step-number">{step.number}</span>
                </div>

                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </article>
            )
          })}
        </nav>

        <footer className="home-footer">
          <Clock3 size={13} />
          <span>Liga Fictícia 2026 · Horário de Brasília { new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }</span>
        </footer>
      </section>
    </main>
  )
}