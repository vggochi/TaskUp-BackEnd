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


        // =================================================
        // FILTRO SKU
        // =================================================

        if (sku) {

            consulta = consulta.eq(
                "sku",
                String(sku).trim()
            );

        }


        // =================================================
        // FILTRO TIPO
        // =================================================

        if (
            tipo === "entrada" ||
            tipo === "saida"
        ) {

            consulta = consulta.eq(
                "tipo_movimentacao",
                tipo
            );

        }


        // =================================================
        // FILTRO RESPONSÁVEL
        // =================================================

        if (responsavel) {

            consulta = consulta.ilike(
                "responsavel",
                `%${String(responsavel).trim()}%`
            );

        }


        // =================================================
        // FILTRO DATA INICIAL
        // =================================================

        if (data_inicio) {

            consulta = consulta.gte(
                "criado_em",
                data_inicio
            );

        }


        // =================================================
        // FILTRO DATA FINAL
        // =================================================

        if (data_fim) {

            consulta = consulta.lte(
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
                    error.message ||
                    "Erro ao buscar movimentações.",

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

        try {

            console.log(
                "================================="
            );

            console.log(
                "TASKUP - ENTRADA"
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


            // ---------------------------------------------
            // VALIDA SKU
            // ---------------------------------------------

            validarSKU(sku);


            // ---------------------------------------------
            // VALIDA QUANTIDADE
            // ---------------------------------------------

            const valor =
                validarQuantidade(
                    quantidade
                );


            // ---------------------------------------------
            // VALIDA RESPONSÁVEL
            // ---------------------------------------------

            if (!responsavel?.trim()) {

                return res.status(400).json({

                    erro:
                        "O responsável é obrigatório."

                });

            }


            // ---------------------------------------------
            // LIMPA DADOS
            // ---------------------------------------------

            const skuLimpo =
                String(
                    sku
                ).trim();


            const responsavelLimpo =
                String(
                    responsavel
                ).trim();


            const observacoesLimpa =
                observacoes === null ||
                observacoes === undefined ||
                String(observacoes).trim() === ""
                    ? null
                    : String(
                        observacoes
                    ).trim();


            // ---------------------------------------------
            // PARAMETROS DA RPC
            // ---------------------------------------------

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


            // ---------------------------------------------
            // CHAMA SUPABASE
            // ---------------------------------------------

            const {
                data,
                error
            } = await supabase.rpc(
                "registrar_movimentacao",
                parametros
            );


            // ---------------------------------------------
            // ERRO DO SUPABASE
            // ---------------------------------------------

            if (error) {

                console.error(
                    "================================="
                );

                console.error(
                    "ERRO RPC ENTRADA"
                );

                console.error(
                    "MESSAGE:",
                    error.message
                );

                console.error(
                    "DETAILS:",
                    error.details
                );

                console.error(
                    "HINT:",
                    error.hint
                );

                console.error(
                    "CODE:",
                    error.code
                );

                console.error(
                    "================================="
                );


                return res.status(500).json({

                    erro:
                        error.message ||
                        "Erro ao registrar entrada.",

                    details:
                        error.details || null,

                    hint:
                        error.hint || null,

                    code:
                        error.code || null

                });

            }


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

        } catch (error) {

            console.error(
                "ERRO GERAL ENTRADA:",
                error
            );


            return res.status(500).json({

                erro:
                    error.message ||
                    "Erro interno do servidor.",

                details:
                    error.details || null,

                hint:
                    error.hint || null,

                code:
                    error.code || null

            });

        }

    })
);


// =====================================================
// SAÍDA
// POST /api/movimentacoes/saida
// =====================================================

router.post(
    "/saida",
    asyncHandler(async (req, res) => {

        try {

            console.log(
                "================================="
            );

            console.log(
                "TASKUP - SAÍDA"
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


            // ---------------------------------------------
            // VALIDA SKU
            // ---------------------------------------------

            validarSKU(sku);


            // ---------------------------------------------
            // VALIDA QUANTIDADE
            // ---------------------------------------------

            const valor =
                validarQuantidade(
                    quantidade
                );


            // ---------------------------------------------
            // VALIDA MOTIVO
            // ---------------------------------------------

            if (!motivo?.trim()) {

                return res.status(400).json({

                    erro:
                        "O motivo é obrigatório."

                });

            }


            // ---------------------------------------------
            // VALIDA RESPONSÁVEL
            // ---------------------------------------------

            if (!responsavel?.trim()) {

                return res.status(400).json({

                    erro:
                        "O responsável é obrigatório."

                });

            }


            // ---------------------------------------------
            // LIMPA DADOS
            // ---------------------------------------------

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
                observacoes === null ||
                observacoes === undefined ||
                String(observacoes).trim() === ""
                    ? null
                    : String(
                        observacoes
                    ).trim();


            // ---------------------------------------------
            // PARAMETROS DA RPC
            // ---------------------------------------------

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


            // ---------------------------------------------
            // CHAMA SUPABASE
            // ---------------------------------------------

            const {
                data,
                error
            } = await supabase.rpc(
                "registrar_movimentacao",
                parametros
            );


            // ---------------------------------------------
            // ERRO DO SUPABASE
            // ---------------------------------------------

            if (error) {

                console.error(
                    "================================="
                );

                console.error(
                    "ERRO RPC SAÍDA"
                );

                console.error(
                    "MESSAGE:",
                    error.message
                );

                console.error(
                    "DETAILS:",
                    error.details
                );

                console.error(
                    "HINT:",
                    error.hint
                );

                console.error(
                    "CODE:",
                    error.code
                );

                console.error(
                    "================================="
                );


                const mensagem =
                    String(
                        error.message || ""
                    ).toLowerCase();


                if (
                    mensagem.includes(
                        "estoque_insuficiente"
                    ) ||
                    mensagem.includes(
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
                        error.message ||
                        "Erro ao registrar saída.",

                    details:
                        error.details || null,

                    hint:
                        error.hint || null,

                    code:
                        error.code || null

                });

            }


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

        } catch (error) {

            console.error(
                "ERRO GERAL SAÍDA:",
                error
            );


            return res.status(500).json({

                erro:
                    error.message ||
                    "Erro interno do servidor.",

                details:
                    error.details || null,

                hint:
                    error.hint || null,

                code:
                    error.code || null

            });

        }

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

            console.error(
                "ERRO TESTE MOVIMENTAÇÕES:",
                error
            );


            return res.status(500).json({

                sucesso: false,

                erro:
                    error.message,

                details:
                    error.details || null,

                hint:
                    error.hint || null,

                code:
                    error.code || null

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
