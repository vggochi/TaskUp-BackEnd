import { Router } from "express";

import { supabase } from "./supabase.js";
import { asyncHandler } from "./middleware.js";

const router = Router();


// =====================================================
// LISTAR TIPOS
// GET /api/tipos
// =====================================================

router.get(
    "/",
    asyncHandler(async (req, res) => {

        let consulta = supabase
            .from("tipos")
            .select(`
                *,
                familia:familias(
                    id,
                    codigo,
                    nome
                )
            `)
            .order("codigo", {
                ascending: true
            });


        if (req.query.familia_id) {

            consulta = consulta.eq(
                "familia_id",
                req.query.familia_id
            );
        }


        const { data, error } = await consulta;


        if (error) {
            throw error;
        }


        res.json(data);
    })
);


// =====================================================
// CRIAR TIPO
// POST /api/tipos
// =====================================================

router.post(
    "/",
    asyncHandler(async (req, res) => {

        const {
            familia_id,
            nome,
            descricao = null
        } = req.body;


        if (!familia_id || !nome?.trim()) {

            return res.status(400).json({
                erro: "familia_id e nome são obrigatórios."
            });
        }


        const {
            data: ultimoTipo,
            error: erroBusca
        } = await supabase
            .from("tipos")
            .select("codigo")
            .eq("familia_id", familia_id)
            .order("codigo", {
                ascending: false
            })
            .limit(1)
            .maybeSingle();


        if (erroBusca) {
            throw erroBusca;
        }


        const proximoCodigo = String(
            Number(ultimoTipo?.codigo || 0) + 1
        ).padStart(3, "0");


        const { data, error } = await supabase
            .from("tipos")
            .insert({
                familia_id,
                codigo: proximoCodigo,
                nome: nome.trim(),
                descricao
            })
            .select(`
                *,
                familia:familias(
                    id,
                    codigo,
                    nome
                )
            `)
            .single();


        if (error) {
            throw error;
        }


        res.status(201).json(data);
    })
);


// =====================================================
// EDITAR TIPO
// PUT /api/tipos/:id
// =====================================================

router.put(
    "/:id",
    asyncHandler(async (req, res) => {

        const {
            nome,
            descricao
        } = req.body;


        const dados = {};


        if (nome !== undefined) {
            dados.nome = String(nome).trim();
        }


        if (descricao !== undefined) {
            dados.descricao = descricao;
        }


        if (Object.keys(dados).length === 0) {

            return res.status(400).json({
                erro: "Nenhum campo válido foi enviado."
            });
        }


        const { data, error } = await supabase
            .from("tipos")
            .update(dados)
            .eq("id", req.params.id)
            .select(`
                *,
                familia:familias(
                    id,
                    codigo,
                    nome
                )
            `)
            .single();


        if (error) {
            throw error;
        }


        res.json(data);
    })
);


// =====================================================
// EXCLUIR TIPO
// DELETE /api/tipos/:id
// =====================================================

router.delete(
    "/:id",
    asyncHandler(async (req, res) => {

        const { error } = await supabase
            .from("tipos")
            .delete()
            .eq("id", req.params.id);


        if (error) {
            throw error;
        }


        res.status(204).send();
    })
);


export default router;