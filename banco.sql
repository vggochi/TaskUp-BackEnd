-- ============================================================
-- TASKUP
-- BANCO DE DADOS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- FAMÍLIAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.familias (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    codigo VARCHAR(3)
        NOT NULL
        UNIQUE,

    nome VARCHAR(120)
        NOT NULL,

    descricao TEXT,

    criado_em TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
);


-- ============================================================
-- TIPOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tipos (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    familia_id UUID
        NOT NULL
        REFERENCES public.familias(id)
        ON DELETE CASCADE,

    codigo VARCHAR(3)
        NOT NULL,

    nome VARCHAR(120)
        NOT NULL,

    descricao TEXT,

    criado_em TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    UNIQUE(
        familia_id,
        codigo
    ),

    UNIQUE(
        familia_id,
        nome
    )
);


-- ============================================================
-- PRODUTOS
-- SKU = FFF.TTT.PPPP
-- ============================================================

CREATE TABLE IF NOT EXISTS public.produtos (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    sku VARCHAR(12)
        NOT NULL
        UNIQUE,

    familia_id UUID
        NOT NULL
        REFERENCES public.familias(id),

    tipo_id UUID
        NOT NULL
        REFERENCES public.tipos(id),

    nome VARCHAR(180)
        NOT NULL,

    descricao TEXT,

    localizacao VARCHAR(180),

    quantidade INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (
            quantidade >= 0
        ),

    estoque_minimo INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (
            estoque_minimo >= 0
        ),

    criado_em TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    atualizado_em TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
);


-- ============================================================
-- MOVIMENTAÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.movimentacoes (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    produto_id UUID
        NOT NULL
        REFERENCES public.produtos(id),

    sku VARCHAR(12)
        NOT NULL,

    familia_id UUID
        NOT NULL
        REFERENCES public.familias(id),

    tipo_id UUID
        NOT NULL
        REFERENCES public.tipos(id),

    tipo_movimentacao VARCHAR(10)
        NOT NULL
        CHECK (
            tipo_movimentacao
            IN (
                'entrada',
                'saida'
            )
        ),

    quantidade INTEGER
        NOT NULL
        CHECK (
            quantidade > 0
        ),

    motivo VARCHAR(255),

    responsavel VARCHAR(150)
        NOT NULL,

    observacoes TEXT,

    criado_em TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
);


-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_produtos_sku
ON public.produtos(sku);


CREATE INDEX IF NOT EXISTS
idx_produtos_familia
ON public.produtos(familia_id);


CREATE INDEX IF NOT EXISTS
idx_produtos_tipo
ON public.produtos(tipo_id);


CREATE INDEX IF NOT EXISTS
idx_movimentacoes_sku
ON public.movimentacoes(sku);


CREATE INDEX IF NOT EXISTS
idx_movimentacoes_data
ON public.movimentacoes(
    criado_em DESC
);


-- ============================================================
-- ATUALIZAR atualizado_em
-- ============================================================

CREATE OR REPLACE FUNCTION
public.atualizar_data_modificacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$

BEGIN

    NEW.atualizado_em =
        NOW();

    RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS
produtos_atualizar_data
ON public.produtos;


CREATE TRIGGER
produtos_atualizar_data

BEFORE UPDATE
ON public.produtos

FOR EACH ROW

EXECUTE FUNCTION
public.atualizar_data_modificacao();


-- ============================================================
-- CRIAR PRODUTO COM SKU
-- ============================================================

CREATE OR REPLACE FUNCTION
public.criar_produto_com_sku(

    p_familia_id UUID,

    p_tipo_id UUID,

    p_nome TEXT,

    p_descricao TEXT DEFAULT NULL,

    p_localizacao TEXT DEFAULT NULL,

    p_quantidade_inicial INTEGER DEFAULT 0,

    p_estoque_minimo INTEGER DEFAULT 0

)

RETURNS public.produtos

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

    codigo_familia VARCHAR(3);

    codigo_tipo VARCHAR(3);

    proximo_produto INTEGER;

    novo_sku VARCHAR(12);

    produto_criado public.produtos;

BEGIN


    IF p_quantidade_inicial < 0 THEN

        RAISE EXCEPTION
            'Quantidade inicial não pode ser negativa.';

    END IF;


    IF p_estoque_minimo < 0 THEN

        RAISE EXCEPTION
            'Estoque mínimo não pode ser negativo.';

    END IF;


    -- BUSCAR FAMÍLIA

    SELECT codigo

    INTO codigo_familia

    FROM public.familias

    WHERE id =
        p_familia_id

    FOR UPDATE;


    IF codigo_familia IS NULL THEN

        RAISE EXCEPTION
            'Família não encontrada.';

    END IF;


    -- BUSCAR TIPO

    SELECT codigo

    INTO codigo_tipo

    FROM public.tipos

    WHERE id =
        p_tipo_id

    AND familia_id =
        p_familia_id

    FOR UPDATE;


    IF codigo_tipo IS NULL THEN

        RAISE EXCEPTION
            'Tipo não encontrado ou não pertence à família.';

    END IF;


    -- EVITAR DUPLICAÇÃO DE SKU

    PERFORM pg_advisory_xact_lock(

        hashtextextended(

            p_familia_id::TEXT
            ||
            ':'
            ||
            p_tipo_id::TEXT,

            0

        )

    );


    -- ENCONTRAR PRÓXIMO PPPP

    SELECT

        COALESCE(

            MAX(

                CAST(

                    SUBSTRING(
                        sku
                        FROM 9 FOR 4
                    )

                    AS INTEGER

                )

            ),

            0

        ) + 1

    INTO proximo_produto

    FROM public.produtos

    WHERE familia_id =
        p_familia_id

    AND tipo_id =
        p_tipo_id;


    IF proximo_produto > 9999 THEN

        RAISE EXCEPTION
            'Limite de 9999 produtos atingido para este tipo.';

    END IF;


    -- GERAR SKU

    novo_sku =

        codigo_familia
        ||
        '.'
        ||
        codigo_tipo
        ||
        '.'
        ||
        LPAD(
            proximo_produto::TEXT,
            4,
            '0'
        );


    -- CRIAR PRODUTO

    INSERT INTO public.produtos (

        sku,

        familia_id,

        tipo_id,

        nome,

        descricao,

        localizacao,

        quantidade,

        estoque_minimo

    )

    VALUES (

        novo_sku,

        p_familia_id,

        p_tipo_id,

        TRIM(p_nome),

        p_descricao,

        p_localizacao,

        p_quantidade_inicial,

        p_estoque_minimo

    )

    RETURNING *

    INTO produto_criado;


    RETURN produto_criado;

END;

$$;


-- ============================================================
-- REGISTRAR MOVIMENTAÇÃO
-- ============================================================

CREATE OR REPLACE FUNCTION
public.registrar_movimentacao(

    p_sku VARCHAR,

    p_tipo_movimentacao VARCHAR,

    p_quantidade INTEGER,

    p_motivo TEXT,

    p_responsavel TEXT,

    p_observacoes TEXT DEFAULT NULL

)

RETURNS public.movimentacoes

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

    produto public.produtos;

    movimentacao public.movimentacoes;

    nova_quantidade INTEGER;

BEGIN


    IF
        p_tipo_movimentacao
        NOT IN (
            'entrada',
            'saida'
        )

    THEN

        RAISE EXCEPTION
            'Tipo de movimentação inválido.';

    END IF;


    IF p_quantidade <= 0 THEN

        RAISE EXCEPTION
            'Quantidade deve ser maior que zero.';

    END IF;


    -- BLOQUEAR PRODUTO

    SELECT *

    INTO produto

    FROM public.produtos

    WHERE sku =
        p_sku

    FOR UPDATE;


    IF produto.id IS NULL THEN

        RAISE EXCEPTION
            'Produto não encontrado.';

    END IF;


    -- SAÍDA

    IF
        p_tipo_movimentacao =
        'saida'

    THEN


        IF
            produto.quantidade
            <
            p_quantidade

        THEN

            RAISE EXCEPTION
                'ESTOQUE_INSUFICIENTE: saldo atual = %',
                produto.quantidade;

        END IF;


        nova_quantidade =
            produto.quantidade
            -
            p_quantidade;


    ELSE


        -- ENTRADA

        nova_quantidade =
            produto.quantidade
            +
            p_quantidade;

    END IF;


    -- ATUALIZAR ESTOQUE

    UPDATE public.produtos

    SET quantidade =
        nova_quantidade

    WHERE id =
        produto.id;


    -- REGISTRAR HISTÓRICO

    INSERT INTO public.movimentacoes (

        produto_id,

        sku,

        familia_id,

        tipo_id,

        tipo_movimentacao,

        quantidade,

        motivo,

        responsavel,

        observacoes

    )

    VALUES (

        produto.id,

        produto.sku,

        produto.familia_id,

        produto.tipo_id,

        p_tipo_movimentacao,

        p_quantidade,

        p_motivo,

        TRIM(p_responsavel),

        p_observacoes

    )

    RETURNING *

    INTO movimentacao;


    RETURN movimentacao;

END;

$$;


-- ============================================================
-- DADOS INICIAIS
-- ============================================================

INSERT INTO public.familias (
    codigo,
    nome,
    descricao
)

VALUES (
    '001',
    'Documentos',
    'Documentos e arquivos físicos'
)

ON CONFLICT (
    codigo
)

DO NOTHING;


INSERT INTO public.tipos (
    familia_id,
    codigo,
    nome,
    descricao
)

SELECT

    id,

    '001',

    'Caixas de Arquivo',

    'Caixas destinadas ao armazenamento de documentos'

FROM public.familias

WHERE codigo =
    '001'

ON CONFLICT (
    familia_id,
    codigo
)

DO NOTHING;