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

        let consulta =
            supabase
                .from("movimentacoes")
                .select(`
                    *,
                    produto:produtos(
                        id,
                        sku,
                        nome,
                        localizacao,
                        quantidade
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
                        Math.max(
                            Number(limite) || 100,
                            1
                        ),
                        500
                    )
                );

        if (sku) {

            consulta =
                consulta.eq(
                    "sku",
                    String(sku).trim()
                );

        }

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

        if (responsavel) {

            consulta =
                consulta.ilike(
                    "responsavel",
                    `%${String(responsavel).trim()}%`
                );

        }

        if (data_inicio) {

            consulta =
                consulta.gte(
                    "criado_em",
                    data_inicio
                );

        }

        if (data_fim) {

            consulta =
                consulta.lt(
                    "criado_em",
                    `${data_fim}T23:59:59.999Z`
                );

        }

        const {
            data,
            error
        } = await consulta;

        if (error) {
            throw error;
        }

        res.json(data || []);

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
            "ENTRADA RECEBIDA:",
            req.body
        );

        const {
            sku,
            quantidade,
            responsavel,
            observacoes = null
        } = req.body;

        const skuValidado =
            validarSKU(sku);

        const quantidadeValidada =
            validarQuantidade(
                quantidade
            );

        if (
            !responsavel ||
            !String(responsavel).trim()
        ) {

            return res.status(400).json({
                erro:
                    "O responsável é obrigatório."
            });

        }

        const {
            data,
            error
        } = await supabase.rpc(
            "registrar_movimentacao",
            {
                p_sku:
                    skuValidado,

                p_tipo_movimentacao:
                    "entrada",

                p_quantidade:
                    quantidadeValidada,

                p_motivo:
                    "Entrada no arquivo morto",

                p_responsavel:
                    String(responsavel).trim(),

                p_observacoes:
                    observacoes || null
            }
        );

        if (error) {

            console.error(
                "ERRO RPC ENTRADA:",
                error
            );

            throw error;

        }

        const movimentacao =
            Array.isArray(data)
                ? data[0]
                : data;

        console.log(
            "ENTRADA REGISTRADA:",
            movimentacao
        );

        res.status(201).json({
            sucesso: true,
            mensagem:
                "Entrada registrada com sucesso.",
            movimentacao
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
            "SAÍDA RECEBIDA:",
            req.body
        );

        const {
            sku,
            quantidade,
            motivo,
            responsavel,
            observacoes = null
        } = req.body;

        const skuValidado =
            validarSKU(sku);

        const quantidadeValidada =
            validarQuantidade(
                quantidade
            );

        if (
            !motivo ||
            !String(motivo).trim()
        ) {

            return res.status(400).json({
                erro:
                    "O motivo da retirada é obrigatório."
            });

        }

        if (
            !responsavel ||
            !String(responsavel).trim()
        ) {

            return res.status(400).json({
                erro:
                    "O responsável é obrigatório."
            });

        }

        const {
            data,
            error
        } = await supabase.rpc(
            "registrar_movimentacao",
            {
                p_sku:
                    skuValidado,

                p_tipo_movimentacao:
                    "saida",

                p_quantidade:
                    quantidadeValidada,

                p_motivo:
                    String(motivo).trim(),

                p_responsavel:
                    String(responsavel).trim(),

                p_observacoes:
                    observacoes || null
            }
        );

        if (error) {

            console.error(
                "ERRO RPC SAÍDA:",
                error
            );

            const mensagem =
                String(
                    error.message || ""
                ).toLowerCase();

            if (
                mensagem.includes(
                    "estoque"
                ) ||
                mensagem.includes(
                    "insuficiente"
                )
            ) {

                return res.status(409).json({
                    erro:
                        "Estoque insuficiente para realizar a retirada."
                });

            }

            throw error;

        }

        const movimentacao =
            Array.isArray(data)
                ? data[0]
                : data;

        console.log(
            "SAÍDA REGISTRADA:",
            movimentacao
        );

        res.status(201).json({
            sucesso: true,
            mensagem:
                "Saída registrada com sucesso.",
            movimentacao
        });

    })
);


export default router;
