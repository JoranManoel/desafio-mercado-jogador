-- CreateTable
CREATE TABLE "jogadores" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "posicao" VARCHAR(3) NOT NULL,
    "agilidade" INTEGER NOT NULL,
    "idade" INTEGER NOT NULL,
    "valor_base" DECIMAL(6,2) NOT NULL,
    "condicao" VARCHAR(20) NOT NULL DEFAULT 'APTO',
    "clube_id" INTEGER,
    "velocidade" INTEGER NOT NULL,
    "finalizacao" INTEGER NOT NULL,
    "passe" INTEGER NOT NULL,
    "drible" INTEGER NOT NULL,
    "defesa" INTEGER NOT NULL,
    "fisico" INTEGER NOT NULL,
    "potencial" INTEGER NOT NULL,
    "excluido_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jogadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubes" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "nome_normalizado" VARCHAR(60) NOT NULL,
    "sigla" CHAR(3) NOT NULL,
    "caixa" DECIMAL(10,2) NOT NULL DEFAULT 300.00,
    "formacao" VARCHAR(5),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" SERIAL NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "clube_id" INTEGER NOT NULL,
    "valor_compra" DECIMAL(6,2) NOT NULL,
    "fidelidade_ate" TIMESTAMPTZ(3) NOT NULL,
    "situacao" VARCHAR(12) NOT NULL,
    "iniciado_em" TIMESTAMPTZ(3) NOT NULL,
    "encerrado_em" TIMESTAMPTZ(3),

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes" (
    "id" SERIAL NOT NULL,
    "clube_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "nome_jogador" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(6) NOT NULL,
    "valor" DECIMAL(6,2) NOT NULL,
    "taxa" DECIMAL(6,2) NOT NULL,
    "multa" DECIMAL(6,2) NOT NULL,
    "lucro" DECIMAL(7,2),
    "variacao_caixa" DECIMAL(8,2) NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalacoes" (
    "clube_id" INTEGER NOT NULL,
    "jogador_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalacoes_pkey" PRIMARY KEY ("clube_id","jogador_id")
);

-- CreateTable
CREATE TABLE "partidas" (
    "id" SERIAL NOT NULL,
    "mandante_id" INTEGER NOT NULL,
    "visitante_id" INTEGER NOT NULL,
    "gols_mandante" INTEGER NOT NULL,
    "gols_visitante" INTEGER NOT NULL,
    "formacao_mandante" VARCHAR(5) NOT NULL,
    "formacao_visitante" VARCHAR(5) NOT NULL,
    "jogada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duelos_partida" (
    "id" SERIAL NOT NULL,
    "partida_id" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,
    "clube_atacante_id" INTEGER NOT NULL,
    "atacante_id" INTEGER NOT NULL,
    "defensor_id" INTEGER NOT NULL,
    "nome_atacante" VARCHAR(100) NOT NULL,
    "nome_defensor" VARCHAR(100) NOT NULL,
    "posicao_atacante" VARCHAR(3) NOT NULL,
    "posicao_defensor" VARCHAR(3) NOT NULL,
    "condicao_atacante" VARCHAR(20) NOT NULL,
    "condicao_defensor" VARCHAR(20) NOT NULL,
    "atributo_ataque" VARCHAR(10) NOT NULL,
    "atributo_defesa" VARCHAR(10) NOT NULL,
    "valor_ataque" INTEGER NOT NULL,
    "valor_defesa" INTEGER NOT NULL,
    "gol" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "duelos_partida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jogadores_clube_id_excluido_em_idx" ON "jogadores"("clube_id", "excluido_em");

-- CreateIndex
CREATE UNIQUE INDEX "clubes_nome_normalizado_key" ON "clubes"("nome_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "clubes_sigla_key" ON "clubes"("sigla");

-- CreateIndex
CREATE INDEX "contratos_jogador_id_situacao_idx" ON "contratos"("jogador_id", "situacao");

-- CreateIndex
CREATE INDEX "contratos_clube_id_iniciado_em_idx" ON "contratos"("clube_id", "iniciado_em");

-- CreateIndex
CREATE INDEX "transacoes_clube_id_criado_em_id_idx" ON "transacoes"("clube_id", "criado_em", "id");

-- CreateIndex
CREATE INDEX "transacoes_clube_id_jogador_id_idx" ON "transacoes"("clube_id", "jogador_id");

-- CreateIndex
CREATE UNIQUE INDEX "escalacoes_jogador_id_key" ON "escalacoes"("jogador_id");

-- CreateIndex
CREATE INDEX "partidas_jogada_em_id_idx" ON "partidas"("jogada_em", "id");

-- CreateIndex
CREATE INDEX "partidas_mandante_id_idx" ON "partidas"("mandante_id");

-- CreateIndex
CREATE INDEX "partidas_visitante_id_idx" ON "partidas"("visitante_id");

-- CreateIndex
CREATE INDEX "duelos_partida_clube_atacante_id_idx" ON "duelos_partida"("clube_atacante_id");

-- CreateIndex
CREATE UNIQUE INDEX "duelos_partida_partida_id_ordem_key" ON "duelos_partida"("partida_id", "ordem");

-- AddForeignKey
ALTER TABLE "jogadores" ADD CONSTRAINT "jogadores_clube_id_fkey" FOREIGN KEY ("clube_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_clube_id_fkey" FOREIGN KEY ("clube_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_clube_id_fkey" FOREIGN KEY ("clube_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalacoes" ADD CONSTRAINT "escalacoes_clube_id_fkey" FOREIGN KEY ("clube_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalacoes" ADD CONSTRAINT "escalacoes_jogador_id_fkey" FOREIGN KEY ("jogador_id") REFERENCES "jogadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_mandante_id_fkey" FOREIGN KEY ("mandante_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidas" ADD CONSTRAINT "partidas_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duelos_partida" ADD CONSTRAINT "duelos_partida_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partidas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duelos_partida" ADD CONSTRAINT "duelos_partida_clube_atacante_id_fkey" FOREIGN KEY ("clube_atacante_id") REFERENCES "clubes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duelos_partida" ADD CONSTRAINT "duelos_partida_atacante_id_fkey" FOREIGN KEY ("atacante_id") REFERENCES "jogadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duelos_partida" ADD CONSTRAINT "duelos_partida_defensor_id_fkey" FOREIGN KEY ("defensor_id") REFERENCES "jogadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Um jogador pode ter somente um contrato ATIVO.
CREATE UNIQUE INDEX "contratos_jogador_ativo_key"
ON "contratos" ("jogador_id")
WHERE "situacao" = 'ATIVO';

-- Validações dos jogadores.
ALTER TABLE "jogadores"
ADD CONSTRAINT "jogadores_posicao_check"
CHECK ("posicao" IN ('GOL', 'ZAG', 'LAT', 'MEI', 'ATA'));

ALTER TABLE "jogadores"
ADD CONSTRAINT "jogadores_agilidade_check"
CHECK ("agilidade" BETWEEN 1 AND 100);

ALTER TABLE "jogadores"
ADD CONSTRAINT "jogadores_idade_check"
CHECK (
    "idade" BETWEEN 16 AND 45
    AND ("idade" < 35 OR "agilidade" <= 85)
);

ALTER TABLE "jogadores"
ADD CONSTRAINT "jogadores_condicao_check"
CHECK ("condicao" IN ('APTO', 'MAL_CONDICIONADO', 'DOENTE'));

ALTER TABLE "jogadores"
ADD CONSTRAINT "jogadores_atributos_check"
CHECK (
    "velocidade" BETWEEN 1 AND 99
    AND "finalizacao" BETWEEN 1 AND 99
    AND "passe" BETWEEN 1 AND 99
    AND "drible" BETWEEN 1 AND 99
    AND "defesa" BETWEEN 1 AND 99
    AND "fisico" BETWEEN 1 AND 99
    AND "potencial" BETWEEN 1 AND 99
    AND "potencial" >= GREATEST(
        "velocidade",
        "finalizacao",
        "passe",
        "drible",
        "defesa",
        "fisico"
    )
    AND (
        "velocidade" + "finalizacao" + "passe"
        + "drible" + "defesa" + "fisico"
    ) <= 480
);

ALTER TABLE "jogadores"
ADD CONSTRAINT "jogadores_valor_base_check"
CHECK ("valor_base" >= 1.00);

-- Validações dos clubes.
ALTER TABLE "clubes"
ADD CONSTRAINT "clubes_formacao_check"
CHECK (
    "formacao" IS NULL
    OR "formacao" IN ('3-1', '2-2', '2-1-1', '1-2-1')
);

-- Validações dos contratos.
ALTER TABLE "contratos"
ADD CONSTRAINT "contratos_situacao_check"
CHECK ("situacao" IN ('ATIVO', 'ENCERRADO', 'RESCINDIDO'));

ALTER TABLE "contratos"
ADD CONSTRAINT "contratos_valor_compra_check"
CHECK ("valor_compra" >= 1.00);

ALTER TABLE "contratos"
ADD CONSTRAINT "contratos_encerramento_check"
CHECK (
    ("situacao" = 'ATIVO' AND "encerrado_em" IS NULL)
    OR
    ("situacao" IN ('ENCERRADO', 'RESCINDIDO')
        AND "encerrado_em" IS NOT NULL)
);

-- Validações das transações e do histórico financeiro.
ALTER TABLE "transacoes"
ADD CONSTRAINT "transacoes_tipo_check"
CHECK ("tipo" IN ('COMPRA', 'VENDA'));

ALTER TABLE "transacoes"
ADD CONSTRAINT "transacoes_valores_check"
CHECK (
    "valor" >= 1.00
    AND "taxa" >= 0
    AND "multa" >= 0
);

ALTER TABLE "transacoes"
ADD CONSTRAINT "transacoes_consistencia_check"
CHECK (
    (
        "tipo" = 'COMPRA'
        AND "lucro" IS NULL
        AND "multa" = 0
        AND "variacao_caixa" = -("valor" + "taxa")
    )
    OR
    (
        "tipo" = 'VENDA'
        AND "lucro" IS NOT NULL
        AND "variacao_caixa" = "valor" - "multa" - "taxa"
    )
);

-- Validações das partidas.
ALTER TABLE "partidas"
ADD CONSTRAINT "partidas_clubes_diferentes_check"
CHECK ("mandante_id" <> "visitante_id");

ALTER TABLE "partidas"
ADD CONSTRAINT "partidas_placar_check"
CHECK (
    "gols_mandante" BETWEEN 0 AND 3
    AND "gols_visitante" BETWEEN 0 AND 3
);

ALTER TABLE "partidas"
ADD CONSTRAINT "partidas_formacoes_check"
CHECK (
    "formacao_mandante" IN ('3-1', '2-2', '2-1-1', '1-2-1')
    AND "formacao_visitante" IN ('3-1', '2-2', '2-1-1', '1-2-1')
);

-- Validações dos duelos.
ALTER TABLE "duelos_partida"
ADD CONSTRAINT "duelos_ordem_check"
CHECK ("ordem" BETWEEN 1 AND 6);

ALTER TABLE "duelos_partida"
ADD CONSTRAINT "duelos_posicoes_check"
CHECK (
    "posicao_atacante" IN ('GOL', 'ZAG', 'LAT', 'MEI', 'ATA')
    AND "posicao_defensor" IN ('GOL', 'ZAG', 'LAT', 'MEI', 'ATA')
);

ALTER TABLE "duelos_partida"
ADD CONSTRAINT "duelos_condicoes_check"
CHECK (
    "condicao_atacante" IN ('APTO', 'MAL_CONDICIONADO')
    AND "condicao_defensor" IN ('APTO', 'MAL_CONDICIONADO')
);

ALTER TABLE "duelos_partida"
ADD CONSTRAINT "duelos_atributos_check"
CHECK (
    "atributo_ataque" IN ('shooting', 'passing', 'dribbling')
    AND "atributo_defesa" = 'defending'
);

ALTER TABLE "duelos_partida"
ADD CONSTRAINT "duelos_valores_check"
CHECK (
    "valor_ataque" BETWEEN 1 AND 99
    AND "valor_defesa" BETWEEN 1 AND 99
    AND "gol" = ("valor_ataque" > "valor_defesa")
);