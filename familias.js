import { Router } from "express";

import { supabase } from "./supabase.js";

import {
    asyncHandler,
    validarUUID
} from "./middleware.js";

const router = Router();


// =====================================================
// LISTAR
// GET /api/familias
// =====================================================

router.get(
    "/",
    asyncHandler(async (req, res) => {

        const {
            data,
            error
        } = await supabase
            .from("familias")
            .select("*")
            .order("nome", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        res.json(data || []);

    })
);


// =====================================================
// BUSCAR
// GET /api/familias/:id
// =====================================================

router.get(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            validarUUID(req.params.id);

        const {
            data,
            error
        } = await supabase
            .from("familias")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {

            if (error.code === "PGRST116") {

                return res.status(404).json({
                    erro: "Família não encontrada."
                });

            }

            throw error;
        }

        res.json(data);

    })
);


// =====================================================
// CRIAR
// POST /api/familias
// =====================================================

router.post(
    "/",
    asyncHandler(async (req, res) => {

        const {
            codigo,
            nome,
            descricao = null
        } = req.body;

        if (!codigo?.trim()) {

            return res.status(400).json({
                erro: "Código da família é obrigatório."
            });

        }

        if (!nome?.trim()) {

            return res.status(400).json({
                erro: "Nome da família é obrigatório."
            });

        }

        const {
            data,
            error
        } = await supabase
            .from("familias")
            .insert({
                codigo: codigo.trim(),
                nome: nome.trim(),
                descricao
            })
            .select()
            .single();

        if (error) {

            if (error.code === "23505") {

                return res.status(409).json({
                    erro: "Já existe uma família com esse código."
                });

            }

            throw error;
        }

        res.status(201).json(data);

    })
);


// =====================================================
// EDITAR
// PUT /api/familias/:id
// =====================================================

router.put(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            validarUUID(req.params.id);

        const {
            codigo,
            nome,
            descricao
        } = req.body;

        const atualizacao = {};

        if (codigo !== undefined) {
            atualizacao.codigo =
                String(codigo).trim();
        }

        if (nome !== undefined) {
            atualizacao.nome =
                String(nome).trim();
        }

        if (descricao !== undefined) {
            atualizacao.descricao =
                descricao;
        }

        const {
            data,
            error
        } = await supabase
            .from("familias")
            .update(atualizacao)
            .eq("id", id)
            .select()
            .single();

        if (error) {

            if (error.code === "PGRST116") {

                return res.status(404).json({
                    erro: "Família não encontrada."
                });

            }

            throw error;
        }

        res.json(data);

    })
);


// =====================================================
// EXCLUIR
// DELETE /api/familias/:id
// =====================================================

router.delete(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            validarUUID(req.params.id);

        const {
            error
        } = await supabase
            .from("familias")
            .delete()
            .eq("id", id);

        if (error) {

            if (error.code === "23503") {

                return res.status(409).json({
                    erro:
                        "Não é possível excluir esta família porque existem registros vinculados a ela."
                });

            }

            throw error;
        }

        res.json({
            sucesso: true,
            mensagem: "Família excluída com sucesso."
        });

    })
);


export default router;
