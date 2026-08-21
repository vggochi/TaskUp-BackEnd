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

        let query = supabase
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
                    Number(limite) || 100,
                    500
                )
            );

        if (sku) {
            query = query.eq(
                "sku",
                String(sku).trim()
            );
        }

        if (
            tipo === "entrada" ||
            tipo === "saida"
        ) {
            query = query.eq(
                "tipo_movimentacao",
                tipo
            );
        }

        if (responsavel) {
            query = query.ilike(
                "responsavel",
                `%${String(responsavel).trim()}%`
            );
        }

        if (data_inicio) {
            query = query.gte(
                "criado_em",
                data_inicio
            );
        }

        if (data_fim) {
            query = query.lte(
                "criado_em",
                data_fim
            );
        }

        const {
            data,
            error
        } = await query;

        if (error) {
            throw error;
        }

        res.json(
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

        const skuLimpo =
            String(sku).trim();


        // -------------------------------------------------
        // BUSCA PRODUTO
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
            .eq("sku", skuLimpo)
            .maybeSingle();


        if (produtoError) {
            throw produtoError;
        }


        if (!produto) {
            return res.status(404).json({
                erro:
                    `Produto ${skuLimpo} não encontrado.`
            });
        }


        // -------------------------------------------------
        // NOVO ESTOQUE
        // -------------------------------------------------

        const estoqueAtual =
            Number(
                produto.quantidade
            ) || 0;

        const novoEstoque =
            estoqueAtual + valor;


        // -------------------------------------------------
        // ATUALIZA PRODUTO
        // -------------------------------------------------

        const {
            data: produtoAtualizado,
            error: updateError
        } = await supabase
            .from("produtos")
            .update({
                quantidade:
                    novoEstoque,

                atualizado_em:
                    new Date().toISOString()
            })
            .eq(
                "id",
                produto.id
            )
            .select()
            .single();


        if (updateError) {
            throw updateError;
        }


        // -------------------------------------------------
        // CRIA HISTÓRICO
        // -------------------------------------------------

        const {
            data: movimentacao,
            error: movimentoError
        } = await supabase
            .from("movimentacoes")
            .insert({
                produto_id:
                    produto.id,

                sku:
                    produto.sku,

                familia_id:
                    produto.familia_id,

                tipo_id:
                    produto.tipo_id,

                tipo_movimentacao:
                    "entrada",

                quantidade:
                    valor,

                motivo:
                    "Entrada no arquivo morto",

                responsavel:
                    String(
                        responsavel
                    ).trim(),

                observacoes:
                    observacoes
                        ? String(observacoes).trim()
                        : null
            })
            .select()
            .single();


        if (movimentoError) {

            // Se o histórico falhar, desfaz
            // a atualização do estoque.
            await supabase
                .from("produtos")
                .update({
                    quantidade:
                        estoqueAtual,

                    atualizado_em:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    produto.id
                );

            throw movimentoError;
        }


        res.status(201).json({

            sucesso: true,

            mensagem:
                "Entrada registrada com sucesso.",

            produto:
                produtoAtualizado,

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

        if (!motivo?.trim()) {
            return res.status(400).json({
                erro:
                    "O motivo é obrigatório."
            });
        }

        if (!responsavel?.trim()) {
            return res.status(400).json({
                erro:
                    "O responsável é obrigatório."
            });
        }

        const skuLimpo =
            String(sku).trim();


        // -------------------------------------------------
        // BUSCA PRODUTO
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
            .eq("sku", skuLimpo)
            .maybeSingle();


        if (produtoError) {
            throw produtoError;
        }


        if (!produto) {
            return res.status(404).json({
                erro:
                    `Produto ${skuLimpo} não encontrado.`
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
                    "Estoque insuficiente.",

                estoque_atual:
                    estoqueAtual,

                solicitado:
                    valor
            });
        }


        const novoEstoque =
            estoqueAtual - valor;


        // -------------------------------------------------
        // ATUALIZA PRODUTO
        // -------------------------------------------------

        const {
            data: produtoAtualizado,
            error: updateError
        } = await supabase
            .from("produtos")
            .update({
                quantidade:
                    novoEstoque,

                atualizado_em:
                    new Date().toISOString()
            })
            .eq(
                "id",
                produto.id
            )
            .select()
            .single();


        if (updateError) {
            throw updateError;
        }


        // -------------------------------------------------
        // CRIA HISTÓRICO
        // -------------------------------------------------

        const {
            data: movimentacao,
            error: movimentoError
        } = await supabase
            .from("movimentacoes")
            .insert({
                produto_id:
                    produto.id,

                sku:
                    produto.sku,

                familia_id:
                    produto.familia_id,

                tipo_id:
                    produto.tipo_id,

                tipo_movimentacao:
                    "saida",

                quantidade:
                    valor,

                motivo:
                    String(
                        motivo
                    ).trim(),

                responsavel:
                    String(
                        responsavel
                    ).trim(),

                observacoes:
                    observacoes
                        ? String(observacoes).trim()
                        : null
            })
            .select()
            .single();


        if (movimentoError) {

            // Desfaz alteração do estoque.
            await supabase
                .from("produtos")
                .update({
                    quantidade:
                        estoqueAtual,

                    atualizado_em:
                        new Date().toISOString()
                })
                .eq(
                    "id",
                    produto.id
                );

            throw movimentoError;
        }


        res.status(201).json({

            sucesso: true,

            mensagem:
                "Saída registrada com sucesso.",

            produto:
                produtoAtualizado,

            movimentacao

        });

    })
);


export default router;
