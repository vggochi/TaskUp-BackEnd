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
                    localizacao
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


        if (sku) {

            consulta = consulta.eq(
                "sku",
                sku
            );
        }


        if (
            tipo === "entrada" ||
            tipo === "saida"
        ) {

            consulta = consulta.eq(
                "tipo_movimentacao",
                tipo
            );
        }


        if (responsavel) {

            consulta =
                consulta.ilike(
                    "responsavel",
                    `%${responsavel}%`
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
            throw error;
        }


        res.json(data);
    })
);


// =====================================================
// ENTRADA
// POST /api/movimentacoes/entrada
// =====================================================

router.post(
    "/entrada",
    asyncHandler(async (req, res) => {

        const {
            sku,
            quantidade,
            responsavel,
            observacoes = null
        } = req.body;


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


        const {
            data,
            error
        } = await supabase.rpc(
            "registrar_movimentacao",
            {
                p_sku: sku,
                p_tipo_movimentacao:
                    "entrada",
                p_quantidade: valor,
                p_motivo:
                    "Entrada no arquivo morto",
                p_responsavel:
                    responsavel.trim(),
                p_observacoes:
                    observacoes
            }
        );


        if (error) {
            throw error;
        }


        const movimentacao =
            Array.isArray(data)
                ? data[0]
                : data;


        res.status(201).json(
            movimentacao
        );
    })
);


// =====================================================
// SAÍDA
// POST /api/movimentacoes/saida
// =====================================================

router.post(
    "/saida",
    asyncHandler(async (req, res) => {

        const {
            sku,
            quantidade,
            motivo,
            responsavel,
            observacoes = null
        } = req.body;


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


        const {
            data,
            error
        } = await supabase.rpc(
            "registrar_movimentacao",
            {
                p_sku: sku,
                p_tipo_movimentacao:
                    "saida",
                p_quantidade: valor,
                p_motivo:
                    motivo.trim(),
                p_responsavel:
                    responsavel.trim(),
                p_observacoes:
                    observacoes
            }
        );


        if (error) {

            if (
                error.message?.includes(
                    "ESTOQUE_INSUFICIENTE"
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


        res.status(201).json(
            movimentacao
        );
    })
);


export default router;