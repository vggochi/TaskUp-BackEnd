import { Router } from "express";

import {
    supabase
} from "./supabase.js";

import {
    asyncHandler
} from "./middleware.js";

const router = Router();


// =====================================================
// RESUMO DO DASHBOARD
// GET /api/painel/resumo
// =====================================================

router.get(
    "/resumo",
    asyncHandler(async (req, res) => {

        const [
            produtos,
            familias,
            tipos,
            movimentacoes
        ] = await Promise.all([

            supabase
                .from("produtos")
                .select(
                    "id,quantidade,estoque_minimo"
                ),

            supabase
                .from("familias")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                ),

            supabase
                .from("tipos")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                ),

            supabase
                .from("movimentacoes")
                .select(`
                    *,
                    produto:produtos(
                        sku,
                        nome
                    )
                `)
                .order(
                    "criado_em",
                    {
                        ascending: false
                    }
                )
                .limit(10)
        ]);


        if (produtos.error) {
            throw produtos.error;
        }


        if (familias.error) {
            throw familias.error;
        }


        if (tipos.error) {
            throw tipos.error;
        }


        if (movimentacoes.error) {
            throw movimentacoes.error;
        }


        const listaProdutos =
            produtos.data || [];


        const estoqueBaixo =
            listaProdutos.filter(
                produto =>
                    Number(
                        produto.quantidade
                    ) <=
                    Number(
                        produto.estoque_minimo
                    )
            );


        const quantidadeTotal =
            listaProdutos.reduce(
                (
                    total,
                    produto
                ) =>
                    total +
                    Number(
                        produto.quantidade || 0
                    ),
                0
            );


        res.json({

            total_produtos:
                listaProdutos.length,

            quantidade_total:
                quantidadeTotal,

            estoque_baixo:
                estoqueBaixo.length,

            total_familias:
                familias.count || 0,

            total_tipos:
                tipos.count || 0,

            movimentacoes_recentes:
                movimentacoes.data || []
        });
    })
);


export default router;