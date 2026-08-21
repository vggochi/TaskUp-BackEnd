import { Router } from "express";

import { supabase } from "./supabase.js";

import {
    asyncHandler
} from "./middleware.js";

const router = Router();


// =====================================================
// RESUMO
// GET /api/painel/resumo
// =====================================================

router.get(
    "/resumo",
    asyncHandler(async (req, res) => {

        const [
            produtosResult,
            familiasResult,
            tiposResult,
            movimentacoesResult
        ] = await Promise.all([

            supabase
                .from("produtos")
                .select(
                    "id, quantidade, estoque_minimo",
                    {
                        count: "exact"
                    }
                ),

            supabase
                .from("familias")
                .select(
                    "id",
                    {
                        count: "exact"
                    }
                ),

            supabase
                .from("tipos")
                .select(
                    "id",
                    {
                        count: "exact"
                    }
                ),

            supabase
                .from("movimentacoes")
                .select(
                    "id",
                    {
                        count: "exact"
                    }
                )
        ]);

        if (produtosResult.error) {
            throw produtosResult.error;
        }

        if (familiasResult.error) {
            throw familiasResult.error;
        }

        if (tiposResult.error) {
            throw tiposResult.error;
        }

        if (movimentacoesResult.error) {
            throw movimentacoesResult.error;
        }

        const produtos =
            produtosResult.data || [];

        const estoqueTotal =
            produtos.reduce(
                (total, produto) =>
                    total +
                    Number(
                        produto.quantidade || 0
                    ),
                0
            );

        const estoqueBaixo =
            produtos.filter(
                produto =>
                    Number(
                        produto.quantidade || 0
                    ) <=
                    Number(
                        produto.estoque_minimo || 0
                    )
            ).length;

        res.json({

            produtos:
                produtosResult.count || 0,

            familias:
                familiasResult.count || 0,

            tipos:
                tiposResult.count || 0,

            movimentacoes:
                movimentacoesResult.count || 0,

            estoque_total:
                estoqueTotal,

            estoque_baixo:
                estoqueBaixo

        });

    })
);


export default router;
