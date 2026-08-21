import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import familiasRouter from "./familias.js";
import tiposRouter from "./tipos.js";
import produtosRouter from "./produtos.js";
import movimentacoesRouter from "./movimentacoes.js";
import painelRouter from "./painel.js";

dotenv.config();

const app = express();


// =====================================================
// CONFIGURAÇÃO
// =====================================================

app.use(
    cors({
        origin: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// LOG
// =====================================================

app.use((req, res, next) => {

    console.log(
        `[TASKUP] ${req.method} ${req.originalUrl}`
    );

    if (
        req.method !== "GET" &&
        req.body &&
        Object.keys(req.body).length
    ) {

        console.log(
            "[BODY]",
            req.body
        );

    }

    next();

});


// =====================================================
// PRINCIPAL
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.json({
            nome: "TaskUp API",
            versao: "1.0.0",
            status: "online"
        });

    }
);


// =====================================================
// API
// =====================================================

app.get(
    "/api",
    (req, res) => {

        res.json({
            nome: "TaskUp API",
            versao: "1.0.0",
            status: "online",
            mensagem:
                "API funcionando corretamente."
        });

    }
);


// =====================================================
// TESTE
// =====================================================

app.get(
    "/api/teste",
    (req, res) => {

        res.json({
            sucesso: true,
            mensagem:
                "TaskUp API funcionando.",
            timestamp:
                new Date().toISOString()
        });

    }
);


// =====================================================
// ROTAS
// =====================================================

app.use(
    "/api/familias",
    familiasRouter
);

app.use(
    "/api/tipos",
    tiposRouter
);

app.use(
    "/api/produtos",
    produtosRouter
);

app.use(
    "/api/movimentacoes",
    movimentacoesRouter
);

app.use(
    "/api/painel",
    painelRouter
);


// =====================================================
// 404
// =====================================================

app.use(
    (req, res) => {

        console.log(
            `[404] ${req.method} ${req.originalUrl}`
        );

        res.status(404).json({
            erro: "Rota não encontrada.",
            rota: req.originalUrl,
            metodo: req.method
        });

    }
);


// =====================================================
// ERRO
// =====================================================

app.use(
    (erro, req, res, next) => {

        console.error(
            "================================="
        );

        console.error(
            "TASKUP API - ERRO"
        );

        console.error(
            erro
        );

        console.error(
            "================================="
        );

        const status =
            Number(erro.status) >= 400
                ? Number(erro.status)
                : 500;

        res.status(status).json({

            erro:
                status === 500
                    ? "Erro interno do servidor."
                    : erro.message,

            mensagem:
                erro.message,

            codigo:
                erro.code || null

        });

    }
);


// =====================================================
// LOCAL
// =====================================================

if (
    process.env.NODE_ENV !==
    "production"
) {

    const PORT =
        process.env.PORT || 3000;

    app.listen(
        PORT,
        () => {

            console.log("");
            console.log(
                "================================="
            );
            console.log(
                "🚀 TASKUP API"
            );
            console.log(
                "================================="
            );
            console.log(
                `Servidor: http://localhost:${PORT}`
            );
            console.log(
                `API: http://localhost:${PORT}/api`
            );
            console.log(
                `Movimentações: http://localhost:${PORT}/api/movimentacoes`
            );
            console.log(
                "================================="
            );
            console.log("");

        }
    );

}


export default app;
