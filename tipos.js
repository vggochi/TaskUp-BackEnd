import { Router } from "express";

import { supabase } from "./supabase.js";

import {
    asyncHandler,
    validarUUID
} from "./middleware.js";

const router = Router();


// =====================================================
// LISTAR
// GET /api/tipos
// =====================================================

router.get(
    "/",
    asyncHandler(async (req, res) => {

        const {
            familia_id
        } = req.query;

        let consulta =
            supabase
                .from("tipos")
                .select(`
                    *,
                    familia:familias(
                        id,
                        codigo,
                        nome
                    )
                `)
                .order("nome", {
                    ascending: true
                });

        if (familia_id) {

            validarUUID(familia_id);

            consulta =
                consulta.eq(
                    "familia_id",
                    familia_id
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
// BUSCAR
// GET /api/tipos/:id
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
            .from("tipos")
            .select(`
                *,
                familia:familias(
                    id,
                    codigo,
                    nome
                )
            `)
            .eq("id", id)
            .single();

        if (error) {

            if (error.code === "PGRST116") {

                return res.status(404).json({
                    erro: "Tipo não encontrado."
                });

            }

            throw error;
        }

        res.json(data);

    })
);


// =====================================================
// CRIAR
// POST /api/tipos
// =====================================================

router.post(
    "/",
    asyncHandler(async (req, res) => {

        const {
            familia_id,
            codigo,
            nome,
            descricao = null
        } = req.body;

        if (!familia_id) {

            return res.status(400).json({
                erro: "família é obrigatória."
            });

        }

        validarUUID(familia_id);

        if (!codigo?.trim()) {

            return res.status(400).json({
                erro: "Código do tipo é obrigatório."
            });

        }

        if (!nome?.trim()) {

            return res.status(400).json({
                erro: "Nome do tipo é obrigatório."
            });

        }

        const {
            data,
            error
        } = await supabase
            .from("tipos")
            .insert({
                familia_id,
                codigo: codigo.trim(),
                nome: nome.trim(),
                descricao
            })
            .select()
            .single();

        if (error) {

            if (error.code === "23505") {

                return res.status(409).json({
                    erro: "Já existe um tipo com esse código."
                });

            }

            throw error;
        }

        res.status(201).json(data);

    })
);


// =====================================================
// EDITAR
// PUT /api/tipos/:id
// =====================================================

router.put(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            validarUUID(req.params.id);

        const {
            familia_id,
            codigo,
            nome,
            descricao
        } = req.body;

        const atualizacao = {};

        if (familia_id !== undefined) {

            validarUUID(familia_id);

            atualizacao.familia_id =
                familia_id;

        }

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
            .from("tipos")
            .update(atualizacao)
            .eq("id", id)
            .select()
            .single();

        if (error) {

            if (error.code === "PGRST116") {

                return res.status(404).json({
                    erro: "Tipo não encontrado."
                });

            }

            throw error;
        }

        res.json(data);

    })
);


// =====================================================
// EXCLUIR
// DELETE /api/tipos/:id
// =====================================================

router.delete(
    "/:id",
    asyncHandler(async (req, res) => {

        const id =
            validarUUID(req.params.id);

        const {
            error
        } = await supabase
            .from("tipos")
            .delete()
            .eq("id", id);

        if (error) {

            if (error.code === "23503") {

                return res.status(409).json({
                    erro:
                        "Não é possível excluir este tipo porque existem produtos ou movimentações vinculados."
                });

            }

            throw error;
        }

        res.json({
            sucesso: true,
            mensagem: "Tipo excluído com sucesso."
        });

    })
);


export default router;
