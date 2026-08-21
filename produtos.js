import { Router } from "express";
import QRCode from "qrcode";

import { supabase } from "./supabase.js";

import {
    asyncHandler,
    validarSKU,
    validarQuantidade
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
            busca,
            familia_id,
            tipo_id,
            limite = 500
        } = req.query;


        let query = supabase
            .from("produtos")
            .select(`
                *,
                familia:familias(
                    id,
                    codigo,
                    nome,
                    descricao
                ),
                tipo:tipos(
                    id,
                    codigo,
                    nome,
                    descricao
                )
            `)
            .order("nome", {
                ascending: true
            })
            .limit(
                Math.min(
                    Number(limite) || 500,
                    1000
                )
            );


        // -------------------------------------------------
        // BUSCA
        // -------------------------------------------------

        if (busca) {

            const termo =
                String(
                    busca
                ).trim();


            if (termo) {

                query = query.or(
                    [
                        `sku.ilike.%${termo}%`,
                        `nome.ilike.%${termo}%`,
                        `localizacao.ilike.%${termo}%`
                    ].join(",")
                );

            }

        }


        // -------------------------------------------------
        // FILTRO FAMÍLIA
        // -------------------------------------------------

        if (familia_id) {

            query = query.eq(
                "familia_id",
                familia_id
            );

        }


        // -------------------------------------------------
        // FILTRO TIPO
        // -------------------------------------------------

        if (tipo_id) {

            query = query.eq(
                "tipo_id",
                tipo_id
            );

        }


        const {
            data,
            error
        } = await query;


        if (error) {

            console.error(
                "ERRO AO LISTAR PRODUTOS:",
                error
            );


            return res.status(500).json({

                erro:
                    error.message ||
                    "Erro ao listar produtos.",

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
// BUSCAR PRODUTO POR SKU
// GET /api/produtos/:sku
// =====================================================

router.get(
    "/:sku",
    asyncHandler(async (req, res) => {

        const sku =
            String(
                req.params.sku
            ).trim();


        if (!sku) {

            return res.status(400).json({
                erro:
                    "SKU é obrigatório."
            });

        }


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
                    nome,
                    descricao
                ),
                tipo:tipos(
                    id,
                    codigo,
                    nome,
                    descricao
                )
            `)
            .eq(
                "sku",
                sku
            )
            .maybeSingle();


        if (error) {

            console.error(
                "ERRO AO BUSCAR PRODUTO:",
                error
            );


            return res.status(500).json({

                erro:
                    error.message ||
                    "Erro ao buscar produto.",

                details:
                    error.details || null,

                hint:
                    error.hint || null,

                code:
                    error.code || null

            });

        }


        if (!data) {

            return res.status(404).json({

                erro:
                    `Produto ${sku} não encontrado.`

            });

        }


        return res.status(200).json(
            data
        );

    })
);


// =====================================================
// CRIAR PRODUTO
// POST /api/produtos
// =====================================================

router.post(
    "/",
    asyncHandler(async (req, res) => {

        console.log(
            "================================="
        );

        console.log(
            "POST /api/produtos"
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
            familia_id = null,
            tipo_id = null,
            nome,
            descricao = null,
            localizacao = null,
            quantidade = 0,
            estoque_minimo = 0
        } = req.body;


        // -------------------------------------------------
        // VALIDA SKU
        // -------------------------------------------------

        validarSKU(sku);


        const skuLimpo =
            String(
                sku
            ).trim();


        // -------------------------------------------------
        // VALIDA NOME
        // -------------------------------------------------

        if (!nome?.trim()) {

            return res.status(400).json({

                erro:
                    "O nome do produto é obrigatório."

            });

        }


        // -------------------------------------------------
        // QUANTIDADE
        // -------------------------------------------------

        let quantidadeFinal;


        try {

            quantidadeFinal =
                Number(
                    quantidade
                );

        } catch {

            quantidadeFinal =
                0;

        }


        if (
            !Number.isInteger(
                quantidadeFinal
            ) ||
            quantidadeFinal < 0
        ) {

            return res.status(400).json({

                erro:
                    "A quantidade deve ser um número inteiro maior ou igual a zero."

            });

        }


        // -------------------------------------------------
        // ESTOQUE MÍNIMO
        // -------------------------------------------------

        let estoqueMinimoFinal =
            Number(
                estoque_minimo
            );


        if (
            !Number.isInteger(
                estoqueMinimoFinal
            ) ||
            estoqueMinimoFinal < 0
        ) {

            return res.status(400).json({

                erro:
                    "O estoque mínimo deve ser um número inteiro maior ou igual a zero."

            });

        }


        // -------------------------------------------------
        // VERIFICA SKU EXISTENTE
        // -------------------------------------------------

        const {
            data: existente,
            error: existenteError
        } = await supabase
            .from("produtos")
            .select(
                "id, sku, nome"
            )
            .eq(
                "sku",
                skuLimpo
            )
            .maybeSingle();


        if (existenteError) {

            console.error(
                "ERRO AO VERIFICAR SKU:",
                existenteError
            );


            return res.status(500).json({

                erro:
                    existenteError.message,

                details:
                    existenteError.details || null,

                hint:
                    existenteError.hint || null,

                code:
                    existenteError.code || null

            });

        }


        if (existente) {

            return res.status(409).json({

                erro:
                    `O SKU ${skuLimpo} já está cadastrado.`,

                produto:
                    existente

            });

        }


        // -------------------------------------------------
        // MONTA PAYLOAD
        // -------------------------------------------------

        const payload = {

            sku:
                skuLimpo,

            familia_id:
                familia_id || null,

            tipo_id:
                tipo_id || null,

            nome:
                String(
                    nome
                ).trim(),

            descricao:
                descricao === null ||
                descricao === undefined ||
                String(descricao).trim() === ""
                    ? null
                    : String(
                        descricao
                    ).trim(),

            localizacao:
                localizacao === null ||
                localizacao === undefined ||
                String(localizacao).trim() === ""
                    ? null
                    : String(
                        localizacao
                    ).trim(),

            quantidade:
                quantidadeFinal,

            estoque_minimo:
                estoqueMinimoFinal

        };


        console.log(
            "INSERT PRODUTO:",
            payload
        );


        // -------------------------------------------------
        // INSERE
        // -------------------------------------------------

        const {
            data,
            error
        } = await supabase
            .from("produtos")
            .insert(
                payload
            )
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

            console.error(
                "================================="
            );

            console.error(
                "ERRO SUPABASE AO CRIAR PRODUTO"
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
                    "Erro ao cadastrar produto.",

                details:
                    error.details || null,

                hint:
                    error.hint || null,

                code:
                    error.code || null

            });

        }


        console.log(
            "PRODUTO CRIADO:",
            data
        );


        return res.status(201).json(
            data
        );

    })
);


// =====================================================
// EDITAR PRODUTO
// PUT /api/produtos/:id
// =====================================================

router.put(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            String(
                req.params.id
            ).trim();


        if (!id) {

            return res.status(400).json({
                erro:
                    "ID do produto é obrigatório."
            });

        }


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


        const payload = {};


        // -------------------------------------------------
        // SKU
        // -------------------------------------------------

        if (
            sku !== undefined &&
            sku !== null
        ) {

            validarSKU(sku);


            payload.sku =
                String(
                    sku
                ).trim();

        }


        // -------------------------------------------------
        // FAMÍLIA
        // -------------------------------------------------

        if (
            familia_id !== undefined
        ) {

            payload.familia_id =
                familia_id || null;

        }


        // -------------------------------------------------
        // TIPO
        // -------------------------------------------------

        if (
            tipo_id !== undefined
        ) {

            payload.tipo_id =
                tipo_id || null;

        }


        // -------------------------------------------------
        // NOME
        // -------------------------------------------------

        if (
            nome !== undefined
        ) {

            if (!String(nome).trim()) {

                return res.status(400).json({

                    erro:
                        "O nome do produto não pode ficar vazio."

                });

            }


            payload.nome =
                String(
                    nome
                ).trim();

        }


        // -------------------------------------------------
        // DESCRIÇÃO
        // -------------------------------------------------

        if (
            descricao !== undefined
        ) {

            payload.descricao =
                descricao === null ||
                String(descricao).trim() === ""
                    ? null
                    : String(
                        descricao
                    ).trim();

        }


        // -------------------------------------------------
        // LOCALIZAÇÃO
        // -------------------------------------------------

        if (
            localizacao !== undefined
        ) {

            payload.localizacao =
                localizacao === null ||
                String(localizacao).trim() === ""
                    ? null
                    : String(
                        localizacao
                    ).trim();

        }


        // -------------------------------------------------
        // QUANTIDADE
        // -------------------------------------------------

        if (
            quantidade !== undefined
        ) {

            const valor =
                Number(
                    quantidade
                );


            if (
                !Number.isInteger(valor) ||
                valor < 0
            ) {

                return res.status(400).json({

                    erro:
                        "A quantidade deve ser um número inteiro maior ou igual a zero."

                });

            }


            payload.quantidade =
                valor;

        }


        // -------------------------------------------------
        // ESTOQUE MÍNIMO
        // -------------------------------------------------

        if (
            estoque_minimo !== undefined
        ) {

            const valor =
                Number(
                    estoque_minimo
                );


            if (
                !Number.isInteger(valor) ||
                valor < 0
            ) {

                return res.status(400).json({

                    erro:
                        "O estoque mínimo deve ser um número inteiro maior ou igual a zero."

                });

            }


            payload.estoque_minimo =
                valor;

        }


        // -------------------------------------------------
        // DATA
        // -------------------------------------------------

        payload.atualizado_em =
            new Date().toISOString();


        // -------------------------------------------------
        // UPDATE
        // -------------------------------------------------

        const {
            data,
            error
        } = await supabase
            .from("produtos")
            .update(
                payload
            )
            .eq(
                "id",
                id
            )
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
            .maybeSingle();


        if (error) {

            console.error(
                "ERRO AO EDITAR PRODUTO:",
                error
            );


            return res.status(500).json({

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


        if (!data) {

            return res.status(404).json({

                erro:
                    "Produto não encontrado."

            });

        }


        return res.status(200).json(
            data
        );

    })
);


// =====================================================
// EXCLUIR PRODUTO
// DELETE /api/produtos/:id
// =====================================================

router.delete(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            String(
                req.params.id
            ).trim();


        if (!id) {

            return res.status(400).json({

                erro:
                    "ID do produto é obrigatório."

            });

        }


        // -------------------------------------------------
        // VERIFICA EXISTÊNCIA
        // -------------------------------------------------

        const {
            data: produto,
            error: produtoError
        } = await supabase
            .from("produtos")
            .select(
                "id, sku, nome"
            )
            .eq(
                "id",
                id
            )
            .maybeSingle();


        if (produtoError) {

            return res.status(500).json({

                erro:
                    produtoError.message

            });

        }


        if (!produto) {

            return res.status(404).json({

                erro:
                    "Produto não encontrado."

            });

        }


        // -------------------------------------------------
        // REMOVE
        // -------------------------------------------------

        const {
            error
        } = await supabase
            .from("produtos")
            .delete()
            .eq(
                "id",
                id
            );


        if (error) {

            console.error(
                "ERRO AO EXCLUIR PRODUTO:",
                error
            );


            // Possível FK em movimentações
            if (
                String(
                    error.message || ""
                )
                .toLowerCase()
                .includes(
                    "foreign key"
                )
            ) {

                return res.status(409).json({

                    erro:
                        "Este produto possui movimentações registradas e não pode ser excluído."

                });

            }


            return res.status(500).json({

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

            sucesso:
                true,

            mensagem:
                "Produto excluído com sucesso.",

            produto

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
            String(
                req.params.sku
            ).trim();


        if (!sku) {

            return res.status(400).json({

                erro:
                    "SKU é obrigatório."

            });

        }


        // -------------------------------------------------
        // VERIFICA PRODUTO
        // -------------------------------------------------

        const {
            data: produto,
            error
        } = await supabase
            .from("produtos")
            .select(
                "id, sku, nome"
            )
            .eq(
                "sku",
                sku
            )
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!produto) {

            return res.status(404).json({

                erro:
                    "Produto não encontrado."

            });

        }


        const format =
            String(
                req.query.format ||
                "png"
            ).toLowerCase();


        // -------------------------------------------------
        // PNG
        // -------------------------------------------------

        if (
            format === "png" ||
            format === "image"
        ) {

            const buffer =
                await QRCode.toBuffer(
                    sku,
                    {
                        type:
                            "png",

                        width:
                            700,

                        margin:
                            2,

                        errorCorrectionLevel:
                            "H"

                    }
                );


            res.setHeader(
                "Content-Type",
                "image/png"
            );


            res.setHeader(
                "Content-Disposition",
                `inline; filename="qrcode-${sku}.png"`
            );


            return res.send(
                buffer
            );

        }


        // -------------------------------------------------
        // SVG
        // -------------------------------------------------

        if (
            format === "svg"
        ) {

            const svg =
                await QRCode.toString(
                    sku,
                    {
                        type:
                            "svg",

                        margin:
                            2,

                        errorCorrectionLevel:
                            "H"
                    }
                );


            res.setHeader(
                "Content-Type",
                "image/svg+xml"
            );


            res.setHeader(
                "Content-Disposition",
                `inline; filename="qrcode-${sku}.svg"`
            );


            return res.send(
                svg
            );

        }


        return res.status(400).json({

            erro:
                "Formato inválido. Use png ou svg."

        });

    })
);


// =====================================================
// PRODUTO + QR
// GET /api/produtos/:sku/qrcode-info
// =====================================================

router.get(
    "/:sku/qrcode-info",
    asyncHandler(async (req, res) => {

        const sku =
            String(
                req.params.sku
            ).trim();


        const {
            data,
            error
        } = await supabase
            .from("produtos")
            .select(`
                id,
                sku,
                nome,
                localizacao,
                quantidade
            `)
            .eq(
                "sku",
                sku
            )
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {

            return res.status(404).json({

                erro:
                    "Produto não encontrado."

            });

        }


        return res.json({

            produto:
                data,

            qr:
                sku

        });

    })
);


export default router;
