import { Router } from "express";
import QRCode from "qrcode";

import { supabase } from "./supabase.js";
import {
    asyncHandler,
    validarSKU
} from "./middleware.js";

const router = Router();


const camposProduto = `
    *,
    familia:familias(
        id,
        codigo,
        nome
    ),
    tipo:tipos(
        id,
        codigo,
        nome,
        familia_id
    )
`;


// =====================================================
// LISTAR PRODUTOS
// GET /api/produtos
// =====================================================

router.get(
    "/",
    asyncHandler(async (req, res) => {

        const {
            busca,
            search,
            familia_id,
            tipo_id,
            estoque_baixo
        } = req.query;


        let consulta = supabase
            .from("produtos")
            .select(camposProduto)
            .order("criado_em", {
                ascending: false
            });


        if (familia_id) {

            consulta = consulta.eq(
                "familia_id",
                familia_id
            );
        }


        if (tipo_id) {

            consulta = consulta.eq(
                "tipo_id",
                tipo_id
            );
        }


        const termo = busca || search;


        if (termo?.trim()) {

            consulta = consulta.or(
                `sku.ilike.%${termo}%,nome.ilike.%${termo}%,descricao.ilike.%${termo}%`
            );
        }


        const { data, error } = await consulta;


        if (error) {
            throw error;
        }


        let produtos = data || [];


        if (estoque_baixo === "true") {

            produtos = produtos.filter(
                produto =>
                    Number(produto.quantidade) <=
                    Number(produto.estoque_minimo)
            );
        }


        res.json(produtos);
    })
);


// =====================================================
// BUSCAR PRODUTO POR SKU
// GET /api/produtos/001.001.0001
// =====================================================

router.get(
    "/:sku",
    asyncHandler(async (req, res) => {

        const sku = validarSKU(
            req.params.sku
        );


        const {
            data,
            error
        } = await supabase
            .from("produtos")
            .select(camposProduto)
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
// CADASTRAR PRODUTO
// POST /api/produtos
// =====================================================

router.post(
    "/",
    asyncHandler(async (req, res) => {

        const {
            familia_id,
            tipo_id,
            nome,
            descricao = null,
            localizacao = null,
            quantidade_inicial = 0,
            estoque_minimo = 0
        } = req.body;


        if (
            !familia_id ||
            !tipo_id ||
            !nome?.trim()
        ) {

            return res.status(400).json({
                erro:
                    "familia_id, tipo_id e nome são obrigatórios."
            });
        }


        const quantidade = Number(
            quantidade_inicial
        );

        const minimo = Number(
            estoque_minimo
        );


        if (
            !Number.isInteger(quantidade) ||
            quantidade < 0
        ) {

            return res.status(400).json({
                erro:
                    "A quantidade inicial deve ser um número inteiro maior ou igual a zero."
            });
        }


        if (
            !Number.isInteger(minimo) ||
            minimo < 0
        ) {

            return res.status(400).json({
                erro:
                    "O estoque mínimo deve ser um número inteiro maior ou igual a zero."
            });
        }


        const {
            data,
            error
        } = await supabase.rpc(
            "criar_produto_com_sku",
            {
                p_familia_id: familia_id,
                p_tipo_id: tipo_id,
                p_nome: nome.trim(),
                p_descricao: descricao,
                p_localizacao: localizacao,
                p_quantidade_inicial: quantidade,
                p_estoque_minimo: minimo
            }
        );


        if (error) {
            throw error;
        }


        const produto = Array.isArray(data)
            ? data[0]
            : data;


        res.status(201).json(produto);
    })
);


// =====================================================
// EDITAR PRODUTO
// PUT /api/produtos/:id
// =====================================================

router.put(
    "/:id",
    asyncHandler(async (req, res) => {

        const camposPermitidos = [
            "nome",
            "descricao",
            "localizacao",
            "estoque_minimo"
        ];


        const dados = {};


        for (
            const campo of camposPermitidos
        ) {

            if (
                req.body[campo] !== undefined
            ) {

                dados[campo] =
                    req.body[campo];
            }
        }


        if (
            Object.keys(dados).length === 0
        ) {

            return res.status(400).json({
                erro:
                    "Nenhum campo válido foi enviado."
            });
        }


        const {
            data,
            error
        } = await supabase
            .from("produtos")
            .update(dados)
            .eq("id", req.params.id)
            .select(camposProduto)
            .single();


        if (error) {
            throw error;
        }


        res.json(data);
    })
);


// =====================================================
// EXCLUIR PRODUTO
// DELETE /api/produtos/:id
// =====================================================

router.delete(
    "/:id",
    asyncHandler(async (req, res) => {

        const {
            error
        } = await supabase
            .from("produtos")
            .delete()
            .eq("id", req.params.id);


        if (error) {
            throw error;
        }


        res.status(204).send();
    })
);


// =====================================================
// GERAR QR CODE
// GET /api/produtos/:sku/qrcode
// =====================================================

router.get(
    "/:sku/qrcode",
    asyncHandler(async (req, res) => {

        const sku = validarSKU(
            req.params.sku
        );


        const {
            data: produto,
            error
        } = await supabase
            .from("produtos")
            .select(
                "sku,nome,localizacao"
            )
            .eq("sku", sku)
            .single();


        if (error) {

            if (error.code === "PGRST116") {

                return res.status(404).json({
                    erro:
                        "Produto não encontrado."
                });
            }


            throw error;
        }


        const formato =
            req.query.formato ||
            req.query.format ||
            "dataurl";


        if (formato === "svg") {

            const svg =
                await QRCode.toString(
                    produto.sku,
                    {
                        type: "svg",
                        margin: 2
                    }
                );


            res
                .type("image/svg+xml")
                .send(svg);

            return;
        }


        const dataURL =
            await QRCode.toDataURL(
                produto.sku,
                {
                    width: 500,
                    margin: 2,
                    errorCorrectionLevel:
                        "M"
                }
            );


        res.json({
            sku: produto.sku,
            nome: produto.nome,
            localizacao:
                produto.localizacao,
            dataURL
        });
    })
);


export default router;