import { Router } from "express";
import QRCode from "qrcode";

import { supabase } from "./supabase.js";

import {
    asyncHandler,
    validarSKU,
    validarQuantidade,
    validarUUID
} from "./middleware.js";

const router = Router();


// =====================================================
// LISTAR PRODUTOS
// GET /api/produtos
// =====================================================

router.get(
    "/",
    asyncHandler(async (req, res) => {

        const {
            sku,
            busca,
            familia_id,
            tipo_id,
            localizacao
        } = req.query;

        let consulta =
            supabase
                .from("produtos")
                .select(`
                    *,
                    familia:familias(
                        id,
                        codigo,
                        nome
                    ),
                    tipo:tipos(
                        id,
                        codigo,
                        nome
                    )
                `)
                .order("nome", {
                    ascending: true
                });

        if (sku) {

            consulta =
                consulta.eq(
                    "sku",
                    sku
                );

        }

        if (busca) {

            const termo =
                String(busca).trim();

            if (termo) {

                consulta =
                    consulta.or(
                        `sku.ilike.%${termo}%,nome.ilike.%${termo}%`
                    );

            }

        }

        if (familia_id) {

            validarUUID(familia_id);

            consulta =
                consulta.eq(
                    "familia_id",
                    familia_id
                );

        }

        if (tipo_id) {

            validarUUID(tipo_id);

            consulta =
                consulta.eq(
                    "tipo_id",
                    tipo_id
                );

        }

        if (localizacao) {

            consulta =
                consulta.ilike(
                    "localizacao",
                    `%${localizacao}%`
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
// BUSCAR POR SKU
// GET /api/produtos/:sku
// =====================================================

router.get(
    "/:sku",
    asyncHandler(async (req, res) => {

        const sku =
            validarSKU(req.params.sku);

        const {
            data,
            error
        } = await supabase
            .from("produtos")
            .select(`
                *,
                familia:familias(
                    id,
                    codigo,
                    nome
                ),
                tipo:tipos(
                    id,
                    codigo,
                    nome
                )
            `)
            .eq("sku", sku)
            .single();

        if (error) {

            if (error.code === "PGRST116") {

                return res.status(404).json({
                    erro: "Produto não encontrado."
                });

            }

            throw error;
        }

        res.json(data);

    })
);


// =====================================================
// CRIAR PRODUTO
// POST /api/produtos
// =====================================================

router.post(
    "/",
    asyncHandler(async (req, res) => {

        const {
            sku,
            familia_id,
            tipo_id,
            nome,
            descricao = null,
            localizacao = null,
            quantidade = 0,
            estoque_minimo = 0
        } = req.body;

        if (!nome?.trim()) {

            return res.status(400).json({
                erro: "Nome do produto é obrigatório."
            });

        }

        if (familia_id) {
            validarUUID(familia_id);
        }

        if (tipo_id) {
            validarUUID(tipo_id);
        }

        const qtd =
            validarQuantidade(
                quantidade === "" ||
                quantidade === null ||
                quantidade === undefined
                    ? 1
                    : quantidade
            );

        const estoqueMinimo =
            Number(estoque_minimo);

        if (
            !Number.isInteger(estoqueMinimo) ||
            estoqueMinimo < 0
        ) {

            return res.status(400).json({
                erro:
                    "Estoque mínimo deve ser um número inteiro maior ou igual a zero."
            });

        }

        let data;
        let error;

        if (sku?.trim()) {

            const resultado =
                await supabase
                    .from("produtos")
                    .insert({
                        sku: sku.trim(),
                        familia_id: familia_id || null,
                        tipo_id: tipo_id || null,
                        nome: nome.trim(),
                        descricao,
                        localizacao,
                        quantidade: qtd,
                        estoque_minimo: estoqueMinimo
                    })
                    .select(`
                        *,
                        familia:familias(
                            id,
                            codigo,
                            nome
                        ),
                        tipo:tipos(
                            id,
                            codigo,
                            nome
                        )
                    `)
                    .single();

            data = resultado.data;
            error = resultado.error;

        } else {

            const resultado =
                await supabase.rpc(
                    "criar_produto_com_sku",
                    {
                        p_familia_id:
                            familia_id || null,

                        p_tipo_id:
                            tipo_id || null,

                        p_nome:
                            nome.trim(),

                        p_descricao:
                            descricao,

                        p_localizacao:
                            localizacao,

                        p_quantidade:
                            qtd,

                        p_estoque_minimo:
                            estoqueMinimo
                    }
                );

            data = resultado.data;
            error = resultado.error;

        }

        if (error) {

            if (error.code === "23505") {

                return res.status(409).json({
                    erro:
                        "Já existe um produto com esse SKU."
                });

            }

            throw error;
        }

        const produto =
            Array.isArray(data)
                ? data[0]
                : data;

        res.status(201).json(produto);

    })
);


// =====================================================
// EDITAR
// PUT /api/produtos/:id
// =====================================================

router.put(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            validarUUID(req.params.id);

        const {
            sku,
            familia_id,
            tipo_id,
            nome,
            descricao,
            localizacao,
            quantidade,
            estoque_minimo
        } = req.body;

        const atualizacao = {};

        if (sku !== undefined) {

            validarSKU(sku);

            atualizacao.sku =
                sku.trim();

        }

        if (familia_id !== undefined) {

            if (familia_id !== null) {
                validarUUID(familia_id);
            }

            atualizacao.familia_id =
                familia_id;

        }

        if (tipo_id !== undefined) {

            if (tipo_id !== null) {
                validarUUID(tipo_id);
            }

            atualizacao.tipo_id =
                tipo_id;

        }

        if (nome !== undefined) {

            if (!String(nome).trim()) {

                return res.status(400).json({
                    erro:
                        "Nome do produto não pode ficar vazio."
                });

            }

            atualizacao.nome =
                String(nome).trim();

        }

        if (descricao !== undefined) {
            atualizacao.descricao =
                descricao;
        }

        if (localizacao !== undefined) {
            atualizacao.localizacao =
                localizacao;
        }

        if (quantidade !== undefined) {

            atualizacao.quantidade =
                validarQuantidade(
                    quantidade
                );

        }

        if (estoque_minimo !== undefined) {

            const minimo =
                Number(estoque_minimo);

            if (
                !Number.isInteger(minimo) ||
                minimo < 0
            ) {

                return res.status(400).json({
                    erro:
                        "Estoque mínimo inválido."
                });

            }

            atualizacao.estoque_minimo =
                minimo;

        }

        atualizacao.atualizado_em =
            new Date().toISOString();

        const {
            data,
            error
        } = await supabase
            .from("produtos")
            .update(atualizacao)
            .eq("id", id)
            .select(`
                *,
                familia:familias(
                    id,
                    codigo,
                    nome
                ),
                tipo:tipos(
                    id,
                    codigo,
                    nome
                )
            `)
            .single();

        if (error) {

            if (error.code === "PGRST116") {

                return res.status(404).json({
                    erro:
                        "Produto não encontrado."
                });

            }

            if (error.code === "23505") {

                return res.status(409).json({
                    erro:
                        "Já existe outro produto com esse SKU."
                });

            }

            throw error;
        }

        res.json(data);

    })
);


// =====================================================
// EXCLUIR
// DELETE /api/produtos/:id
// =====================================================

router.delete(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            validarUUID(req.params.id);

        const {
            error
        } = await supabase
            .from("produtos")
            .delete()
            .eq("id", id);

        if (error) {

            if (error.code === "23503") {

                return res.status(409).json({
                    erro:
                        "Não é possível excluir o produto porque existem movimentações vinculadas."
                });

            }

            throw error;
        }

        res.json({
            sucesso: true,
            mensagem:
                "Produto excluído com sucesso."
        });

    })
);


// =====================================================
// QR CODE
// GET /api/produtos/:sku/qrcode
// =====================================================

router.get(
    "/:sku/qrcode",
    asyncHandler(async (req, res) => {

        const sku =
            validarSKU(req.params.sku);

        const formato =
            req.query.format || "svg";

        const conteudo =
            JSON.stringify({
                tipo: "TaskUpProduto",
                sku
            });

        if (formato === "png") {

            const buffer =
                await QRCode.toBuffer(
                    conteudo,
                    {
                        type: "png",
                        width: 600,
                        margin: 2
                    }
                );

            res.setHeader(
                "Content-Type",
                "image/png"
            );

            return res.send(buffer);

        }

        const svg =
            await QRCode.toString(
                conteudo,
                {
                    type: "svg",
                    width: 500,
                    margin: 2
                }
            );

        res.setHeader(
            "Content-Type",
            "image/svg+xml"
        );

        res.send(svg);

    })
);


export default router;
