# ⚽ Mercado de Jogadores – SENAI/PE (CÓD. 237 DESENVOLVEDOR I FULLSTACK)

Sistema completo de gestão de liga e mercado de jogadores de futebol fictícia, contemplando cadastro e avaliação técnica de jogadores, gestão financeira e patrimonial de clubes, transferências com contratos de fidelidade e multas/comissões progressivas, escalação tática e simulação determinística de partidas e classificação da liga.

---

## 1. ⚙️ Pré-requisitos

Para executar o projeto, certifique-se de possuir em seu ambiente:

- **Node.js**: Versão `20 LTS` ou `22 LTS` (projeto desenvolvido e validado em Node.js 22 LTS).
- **npm**: Versão `10` ou superior (gerenciador de pacotes oficial).
- **Docker** e **Docker Compose**: Docker engine 24+ e Docker Compose v2+.
- **Banco de Dados**: PostgreSQL 17 (gerenciado pelo contêiner Docker oficial incluído).

---

## 2. 🗄️ Banco de Dados: Criação e Reinício do Zero

O banco de dados utiliza PostgreSQL e é configurado via Prisma ORM com migrations versionadas. Ele inicia completamente vazio (sem dados pré-carregados).

### 2.1. Subir o contêiner do banco
Na raiz do repositório:
```bash
docker compose up -d db
```

### 2.2. Criar e aplicar as migrações (banco novo)
Na pasta `backend/`:
```bash
cd backend
npx prisma migrate deploy
```

### 2.3. Recriar o banco do zero (reset completo)
Para apagar todas as tabelas e dados e recriar o schema vazio do zero:
```bash
cd backend
npx prisma migrate reset --force
```

---

## 3. 🚀 Passo a Passo para Instalar e Executar (Ubuntu 24.04 / Linux / Docker)

Todos os passos a seguir foram desenhados para reprodução direta no Ubuntu 24.04 com Docker.

### 3.1. Clonar o repositório e preparar o banco
```bash
# Na raiz do repositório
docker compose up -d db
```

### 3.2. Configurar e iniciar o Backend
Em um terminal:
```bash
cd backend
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run start:dev
```
- **Origem da API**: `http://localhost:3000`  
  *(A banca/cliente consome os endpoints com o prefixo `/api/v1`, ex.: `http://localhost:3000/api/v1/players`)*

### 3.3. Configurar e iniciar o Frontend
Em outro terminal:
```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```
- **URL da Interface Web**: `http://localhost:5173`

*(Nota: os arquivos de trava `package-lock.json` de ambas as pastas estão rigorosamente versionados no repositório para garantir reprodutibilidade exata com `npm ci`)*.

---

## 4. 🔑 Variáveis de Ambiente

### Backend (`backend/.env` baseado em `backend/.env.example`)
| Variável | Descrição | Valor padrão |
|---|---|---|
| `DATABASE_URL` | String de conexão com o PostgreSQL | `postgresql://mercado_app:local_dev_password@localhost:5432/mercado_jogadores?schema=public` |
| `FRONTEND_ORIGIN` | Origem autorizada no CORS (sem wildcard `*`) | `http://localhost:5173` |
| `PORT` | Porta HTTP da aplicação NestJS | `3000` |

### Frontend (`frontend/.env` baseado em `frontend/.env.example`)
| Variável | Descrição | Valor padrão |
|---|---|---|
| `VITE_API_URL` | URL base da API consumida pela aplicação | `http://localhost:3000/api/v1` |

---

## 5. 📁 Estrutura de Pastas e Bibliotecas Utilizadas

### Estrutura do Projeto
```text
mercado-jogadores/
├── docker-compose.yaml          # Orquestração do banco PostgreSQL
├── README.md                    # Documentação principal
├── backend/                     # API REST em NestJS e TypeScript
│   ├── prisma/                  # Schema do Prisma e migrações SQL
│   ├── src/
│   │   ├── clubs/               # Módulo de Clubes e patrimônio
│   │   ├── common/              # Utilitários de normalização Unicode
│   │   ├── lineup/              # Módulo de Escalação tática
│   │   ├── market/              # Módulo de Compra e Venda
│   │   ├── matches/             # Módulo de Partidas e Classificação
│   │   ├── players/             # Módulo de Jogadores e cálculos de mercado
│   │   ├── prisma/              # Serviço e adapter do Prisma
│   │   ├── transactions/        # Histórico de transferências e CSV
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
└── frontend/                    # Interface SPA em React 19, TypeScript e Vite
    ├── src/
    │   ├── components/          # Telas (Jogadores, Clubes, Liga, Escalação)
    │   ├── services/            # Clientes HTTP de integração com a API
    │   ├── App.tsx              # Roteamento e navegação principal
    │   └── main.tsx
    └── package.json
```

### Bibliotecas do Backend
- **`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`**: Framework estruturado para Node.js com arquitetura em módulos, injeção de dependência e tratamento centralizado de exceções.
- **`@prisma/client`, `prisma`, `@prisma/adapter-pg`, `pg`**: ORM para manipulação segura e performática do PostgreSQL, garantindo integridade referencial, transações atômicas (`$transaction`) e migrações determinísticas.
- **`class-validator`, `class-transformer`**: Validação de schema e tipos nas requisições REST via Pipes globais do NestJS.
- **`jest`, `ts-jest`**: Suíte de testes automatizados unitários executados diretamente em TypeScript.
- **`oxlint`**: Análise estática ultrarrápida para garantia de código limpo e conformidade com padrões ECMAScript.

### Bibliotecas do Frontend
- **`react`, `react-dom`**: Biblioteca fundamental para renderização reativa baseada em componentes.
- **`vite`**: Ferramenta de build moderna com compilação instantânea e empacotamento otimizado.
- **`typescript`**: Verificação estática de tipos, evitando inconsistências de contrato com a API.
- **`lucide-react`**: Biblioteca de ícones em SVG acessível e consistente.
- **`oxlint`**: Linter leve focado em performance para manter o padrão Clean Code.

---

## 6. 🧠 Decisões e Premissas de Projeto

- **Tratamento de Datas e Horários (RN01)**: Todas as datas e horas manipuladas utilizam estritamente o fuso horário de Brasília (`America/Recife`, UTC-03:00) via `Intl.DateTimeFormat`.
- **Precisão Financeira**: Valores monetários são calculados em centavos inteiros (`cents`), evitando erros clássicos de representação de ponto flutuante em JavaScript, e formatados com 2 casas decimais e arredondamento half-up (para longe do zero) na camada final.
- **Normalização de Textos e Nomes (V4)**: Nomes próprios e buscas textuais sofrem normalização Unicode (decomposição `NFD` para remoção de marcas diacríticas/acentos e conversão para minúsculas), tratando espaços repetidos antes de gravações e comparações.
- **Segurança e CORS**: CORS configurado exclusivamente para a origem declarada em `FRONTEND_ORIGIN`, sem utilização de coringa (`*`).
- **Exportação CSV (RN18)**: Arquivo gerado em codificação UTF-8 sem BOM, com delimitador ponto e vírgula (`;`), decimais com vírgula e quebras de linha estritamente em `\n` (LF).

---

## 7. 🚫 Funcionalidades Não Implementadas

- **Nenhuma**. Todos os requisitos obrigatórios dos 4 módulos (Jogadores, Clubes, Mercado e Liga) foram integralmente implementados e testados.

---

## 8. 🤖 Uso de Inteligência Artificial

Em estrito cumprimento ao item "Uso de inteligência artificial" do enunciado:

- **Ferramentas utilizadas**: Google Antigravity (Claude Sonnet 4.6 / Gemini 3.8).
- **Onde foram utilizadas**:
  - Apoio na auditoria de conformidade entre os requisitos descritos em `Orientações.md` e a implementação do código-fonte.
  - Refatoração dos parâmetros de ordenação e filtros nos serviços de jogadores e histórico de transações.
  - Implementação da suíte de testes automatizados com base nas tabelas oficiais de teste (RN02 a RN06).
  - Correção na formatação do endpoint de exportação CSV (RN18) e ajuste de compatibilidade nos duelos das partidas.
- **Como e por que foram utilizadas**: Para acelerar a identificação de discrepâncias contratuais da API em relação ao barema de avaliação e garantir qualidade e cobertura dos casos-limite de negócio.
- **O que foi aceito, alterado ou descartado**:
  - *Aceito*: Ajustes na estrutura do JSON de partidas (`home`, `away`, `duels`), implementação do parâmetro composto de ordenação, validação dos limites de `limit` e implementação dos testes unitários com Jest.
  - *Alterado*: Preservação de propriedades compatíveis para garantir a integridade da interface frontend sem quebras visuais.
  - *Descartado*: Reimplementações desnecessárias de regras que já estavam corretas e conformes.

---

## 9. 🌟 Diferenciais Técnicos Implementados

- **Testes Automatizados**: Suíte de testes com Jest cobrindo o cálculo do valor de mercado (RN02 a RN05), overall e valor base (RN06) conforme as tabelas do enunciado:
  ```bash
  cd backend
  npm test
  ```
- **Ambiente Docker Reproduzível**: PostgreSQL configurado com volumes persistentes e healthchecks em `docker-compose.yaml`.
- **Lint e Formatação**: Configurados tanto no backend quanto no frontend:
  ```bash
  cd backend && npm run lint
  cd frontend && npm run lint
  ```
