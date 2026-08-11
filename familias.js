import { Router } from "express";

import { supabase } from "./supabase.js";
import { asyncHandler } from "./middleware.js";

const router = Router();


// =====================================================
// LISTAR FAMÍLIASs
// GET /api/familias
// =====================================================

router.get(
    "/",
    asyncHandler(async (req, res) => {

        const { data, error } = await supabase
            .from("familias")
            .select("*")
            .order("codigo", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        res.json(data);
    })
);


// =====================================================
// CRIAR FAMÍLIA
// POST /api/familias
// =====================================================

router.post(
    "/",
    asyncHandler(async (req, res) => {

        const {
            nome,
            descricao = null
        } = req.body;

        if (!nome?.trim()) {

            return res.status(400).json({
                erro: "O nome da família é obrigatório."
            });
        }


        const { data: ultimaFamilia, error: erroBusca } =
            await supabase
                .from("familias")
                .select("codigo")
                .order("codigo", {
                    ascending: false
                })
                .limit(1)
                .maybeSingle();


        if (erroBusca) {
            throw erroBusca;
        }


        const proximoCodigo = String(
            Number(ultimaFamilia?.codigo || 0) + 1
        ).padStart(3, "0");


        const { data, error } = await supabase
            .from("familias")
            .insert({
                codigo: proximoCodigo,
                nome: nome.trim(),
                descricao
            })
            .select()
            .single();


        if (error) {
            throw error;
        }


        res.status(201).json(data);
    })
);


// =====================================================
// EDITAR FAMÍLIA
// PUT /api/familias/:id
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
            .from("familias")
            .update(dados)
            .eq("id", req.params.id)
            .select()
            .single();


        if (error) {
            throw error;
        }


        res.json(data);
    })
);


// =====================================================
// EXCLUIR FAMÍLIA
// DELETE /api/familias/:id
// =====================================================

router.delete(
    "/:id",
    asyncHandler(async (req, res) => {

        const { error } = await supabase
            .from("familias")
            .delete()
            .eq("id", req.params.id);


        if (error) {
            throw error;
        }


        res.status(204).send();
    })
);


export default router;