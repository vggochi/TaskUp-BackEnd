import { Router } from "express";

import { supabase } from "./supabase.js";

import {
    asyncHandler,
    validarSKU,
    validarQuantidade
} from "./middleware.js";

const router = Router();


// =====================================================
// HISTÓRICO
// GET /api/movimentacoes
// =====================================================

router.get(
    "/",
    asyncHandler(async (req, res) => {

        const {
            sku,
            tipo,
            responsavel,
            data_inicio,
            data_fim,
            limite = 100
        } = req.query;


        let consulta = supabase
            .from("movimentacoes")
            .select(`
                *,
                produto:produtos(
                    id,
                    sku,
                    nome,
                    descricao,
                    localizacao,
                    quantidade,
                    estoque_minimo
                ),
                familia:familias(
                    id,
                    codigo,
                    nome
                ),
                tipo_registro:tipos(
                    id,
                    codigo,
                    nome
                )
            `)
            .order("criado_em", {
                ascending: false
            })
            .limit(
                Math.min(
                    Number(limite) || 100,
                    500
                )
            );


        // -------------------------------------------------
        // FILTRO SKU
        // -------------------------------------------------

        if (sku) {

            consulta =
                consulta.eq(
                    "sku",
                    String(sku).trim()
                );

        }


        // -------------------------------------------------
        // FILTRO TIPO
        // -------------------------------------------------

        if (
            tipo === "entrada" ||
            tipo === "saida"
        ) {

            consulta =
                consulta.eq(
                    "tipo_movimentacao",
                    tipo
                );

        }


        // -------------------------------------------------
        // FILTRO RESPONSÁVEL
        // -------------------------------------------------

        if (responsavel) {

            consulta =
                consulta.ilike(
                    "responsavel",
                    `%${String(responsavel).trim()}%`
                );

        }


        // -------------------------------------------------
        // FILTRO DATA INICIAL
        // -------------------------------------------------

        if (data_inicio) {

            consulta =
                consulta.gte(
                    "criado_em",
                    data_inicio
                );

        }


        // -------------------------------------------------
        // FILTRO DATA FINAL
        // -------------------------------------------------

        if (data_fim) {

            consulta =
                consulta.lte(
                    "criado_em",
                    data_fim
                );

        }


        const {
            data,
            error
        } = await consulta;


        if (error) {

            console.error(
                "ERRO AO BUSCAR MOVIMENTAÇÕES:",
                error
            );


            return res.status(500).json({

                erro:
                    "Erro ao buscar movimentações.",

                mensagem:
                    error.message,

                details:
                    error.details || null,

                hint:
                    error.hint || null,

                code:
                    error.code || null

            });

        }


        return res.status(200).json(
            data || []
        );

    })
);


// =====================================================
// ENTRADA
// POST /api/movimentacoes/entrada
// =====================================================

router.post(
    "/entrada",
    asyncHandler(async (req, res) => {

        console.log(
            "================================="
        );

        console.log(
            "POST /api/movimentacoes/entrada"
        );

        console.log(
            "BODY:",
            req.body
        );

        console.log(
            "================================="
        );


        const {
            sku,
            quantidade,
            responsavel,
            observacoes = null
        } = req.body;


        // -------------------------------------------------
        // VALIDAÇÕES
        // -------------------------------------------------

        validarSKU(sku);


        const valor =
            validarQuantidade(
                quantidade
            );


        if (!responsavel?.trim()) {

            return res.status(400).json({

                erro:
                    "O responsável é obrigatório."

            });

        }


        const skuLimpo =
            String(sku).trim();


        const responsavelLimpo =
            String(
                responsavel
            ).trim();


        const observacoesLimpa =
            observacoes
                ? String(
                    observacoes
                ).trim()
                : null;


        // -------------------------------------------------
        // VERIFICA PRODUTO
        // -------------------------------------------------

        const {
            data: produto,
            error: produtoError
        } = await supabase
            .from("produtos")
            .select(`
                id,
                sku,
                nome,
                quantidade,
                familia_id,
                tipo_id
            `)
            .eq(
                "sku",
                skuLimpo
            )
            .maybeSingle();


        if (produtoError) {

            console.error(
                "ERRO AO BUSCAR PRODUTO:",
                produtoError
            );


            return res.status(500).json({

                erro:
                    "Erro ao consultar produto.",

                mensagem:
                    produtoError.message,

                details:
                    produtoError.details || null,

                hint:
                    produtoError.hint || null,

                code:
                    produtoError.code || null

            });

        }


        if (!produto) {

            return res.status(404).json({

                erro:
                    `Produto com SKU ${skuLimpo} não encontrado.`

            });

        }


        // -------------------------------------------------
        // RPC
        // -------------------------------------------------

        console.log(
            "EXECUTANDO RPC registrar_movimentacao..."
        );


        const parametros = {

            p_sku:
                skuLimpo,

            p_tipo_movimentacao:
                "entrada",

            p_quantidade:
                valor,

            p_motivo:
                "Entrada no arquivo morto",

            p_responsavel:
                responsavelLimpo,

            p_observacoes:
                observacoesLimpa

        };


        console.log(
            "PARAMETROS RPC:",
            parametros
        );


        const {
            data,
            error
        } = await supabase.rpc(
            "registrar_movimentacao",
            parametros
        );


        // -------------------------------------------------
        // ERRO RPC
        // -------------------------------------------------

        if (error) {

            console.error(
                "================================="
            );

            console.error(
                "ERRO SUPABASE - ENTRADA"
            );

            console.error(
                "message:",
                error.message
            );

            console.error(
                "details:",
                error.details
            );

            console.error(
                "hint:",
                error.hint
            );

            console.error(
                "code:",
                error.code
            );

            console.error(
                "================================="
            );


            return res.status(500).json({

                erro:
                    "Erro ao registrar entrada.",

                mensagem:
                    error.message,

                details:
                    error.details || null,

                hint:
                    error.hint || null,

                code:
                    error.code || null

            });

        }


        // -------------------------------------------------
        // RESULTADO
        // -------------------------------------------------

        const movimentacao =
            Array.isArray(data)
                ? data[0]
                : data;


        console.log(
            "ENTRADA REGISTRADA:",
            movimentacao
        );


        return res.status(201).json({

            sucesso: true,

            mensagem:
                "Entrada registrada com sucesso.",

            movimentacao:
                movimentacao || null

        });

    })
);


// =====================================================
// SAÍDA
// POST /api/movimentacoes/saida
// =====================================================

router.post(
    "/saida",
    asyncHandler(async (req, res) => {

        console.log(
            "================================="
        );

        console.log(
            "POST /api/movimentacoes/saida"
        );

        console.log(
            "BODY:",
            req.body
        );

        console.log(
            "================================="
        );


        const {
            sku,
            quantidade,
            motivo,
            responsavel,
            observacoes = null
        } = req.body;


        // -------------------------------------------------
        // VALIDAÇÕES
        // -------------------------------------------------

        validarSKU(sku);


        const valor =
            validarQuantidade(
                quantidade
            );


        if (
            !motivo?.trim() ||
            !responsavel?.trim()
        ) {

            return res.status(400).json({

                erro:
                    "Motivo e responsável são obrigatórios."

            });

        }


        const skuLimpo =
            String(
                sku
            ).trim();


        const motivoLimpo =
            String(
                motivo
            ).trim();


        const responsavelLimpo =
            String(
                responsavel
            ).trim();


        const observacoesLimpa =
            observacoes
                ? String(
                    observacoes
                ).trim()
                : null;


        // -------------------------------------------------
        // VERIFICA PRODUTO
        // -------------------------------------------------

        const {
            data: produto,
            error: produtoError
        } = await supabase
            .from("produtos")
            .select(`
                id,
                sku,
                nome,
                quantidade,
                familia_id,
                tipo_id
            `)
            .eq(
                "sku",
                skuLimpo
            )
            .maybeSingle();


        if (produtoError) {

            console.error(
                "ERRO AO BUSCAR PRODUTO:",
                produtoError
            );


            return res.status(500).json({

                erro:
                    "Erro ao consultar produto.",

                mensagem:
                    produtoError.message,

                details:
                    produtoError.details || null,

                hint:
                    produtoError.hint || null,

                code:
                    produtoError.code || null

            });

        }


        if (!produto) {

            return res.status(404).json({

                erro:
                    `Produto com SKU ${skuLimpo} não encontrado.`

            });

        }


        // -------------------------------------------------
        // ESTOQUE
        // -------------------------------------------------

        const estoqueAtual =
            Number(
                produto.quantidade
            ) || 0;


        if (
            valor >
            estoqueAtual
        ) {

            return res.status(409).json({

                erro:
                    "Estoque insuficiente para realizar a retirada.",

                estoque_atual:
                    estoqueAtual,

                solicitado:
                    valor

            });

        }


        // -------------------------------------------------
        // RPC
        // -------------------------------------------------

        console.log(
            "EXECUTANDO RPC registrar_movimentacao..."
        );


        const parametros = {

            p_sku:
                skuLimpo,

            p_tipo_movimentacao:
                "saida",

            p_quantidade:
                valor,

            p_motivo:
                motivoLimpo,

            p_responsavel:
                responsavelLimpo,

            p_observacoes:
                observacoesLimpa

        };


        console.log(
            "PARAMETROS RPC:",
            parametros
        );


        const {
            data,
            error
        } = await supabase.rpc(
            "registrar_movimentacao",
            parametros
        );


        // -------------------------------------------------
        // ERRO RPC
        // -------------------------------------------------

        if (error) {

            console.error(
                "================================="
            );

            console.error(
                "ERRO SUPABASE - SAÍDA"
            );

            console.error(
                "message:",
                error.message
            );

            console.error(
                "details:",
                error.details
            );

            console.error(
                "hint:",
                error.hint
            );

            console.error(
                "code:",
                error.code
            );

            console.error(
                "================================="
            );


            const textoErro =
                String(
                    error.message ||
                    ""
                ).toLowerCase();


            if (
                textoErro.includes(
                    "estoque_insuficiente"
                ) ||
                textoErro.includes(
                    "estoque insuficiente"
                )
            ) {

                return res.status(409).json({

                    erro:
                        "Estoque insuficiente para realizar a retirada."

                });

            }


            return res.status(500).json({

                erro:
                    "Erro ao registrar saída.",

                mensagem:
                    error.message,

                details:
                    error.details || null,

                hint:
                    error.hint || null,

                code:
                    error.code || null

            });

        }


        // -------------------------------------------------
        // RESULTADO
        // -------------------------------------------------

        const movimentacao =
            Array.isArray(data)
                ? data[0]
                : data;


        console.log(
            "SAÍDA REGISTRADA:",
            movimentacao
        );


        return res.status(201).json({

            sucesso: true,

            mensagem:
                "Saída registrada com sucesso.",

            movimentacao:
                movimentacao || null

        });

    })
);


// =====================================================
// TESTE DA ROTA
// GET /api/movimentacoes/teste
// =====================================================

router.get(
    "/teste",
    asyncHandler(async (req, res) => {

        const {
            data,
            error
        } = await supabase
            .from("movimentacoes")
            .select("id")
            .limit(1);


        if (error) {

            return res.status(500).json({

                sucesso: false,

                erro:
                    error.message

            });

        }


        return res.status(200).json({

            sucesso: true,

            mensagem:
                "Rota de movimentações funcionando.",

            banco:
                "conectado",

            registros:
                data?.length || 0

        });

    })
);


export default router;
