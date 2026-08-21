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
// CONFIGURAÇÕES
// =====================================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// =====================================================
// LOG DE REQUISIÇÕES
// =====================================================

app.use((req, res, next) => {

    console.log("=================================");
    console.log("TASKUP REQUEST");
    console.log("METHOD:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("BODY:", req.body);
    console.log("=================================");

    next();

});


// =====================================================
// ROTA PRINCIPAL
// =====================================================

app.get("/", (req, res) => {

    res.status(200).json({

        nome: "TaskUp API",

        versao: "1.0.0",

        status: "online",

        mensagem: "API TaskUp funcionando corretamente."

    });

});


// =====================================================
// API
// =====================================================

app.get("/api", (req, res) => {

    res.status(200).json({

        nome: "TaskUp API",

        status: "online",

        mensagem: "API funcionando corretamente."

    });

});


// =====================================================
// TESTE DA API
// =====================================================

app.get("/api/teste", (req, res) => {

    res.status(200).json({

        sucesso: true,

        mensagem: "Servidor TaskUp atualizado e funcionando.",

        timestamp: new Date().toISOString()

    });

});


// =====================================================
// TESTE DAS MOVIMENTAÇÕES
// =====================================================

app.get("/api/movimentacoes-teste", (req, res) => {

    res.status(200).json({

        sucesso: true,

        rota: "movimentacoes-teste",

        mensagem: "A rota de movimentações está sendo alcançada."

    });

});


// =====================================================
// FAMÍLIAS
// =====================================================

app.use(
    "/api/familias",
    familiasRouter
);


// =====================================================
// TIPOS
// =====================================================

app.use(
    "/api/tipos",
    tiposRouter
);


// =====================================================
// PRODUTOS
// =====================================================

app.use(
    "/api/produtos",
    produtosRouter
);


// =====================================================
// MOVIMENTAÇÕES
// =====================================================

console.log("=================================");
console.log("CARREGANDO ROTAS DE MOVIMENTAÇÕES");
console.log(
    "movimentacoesRouter:",
    typeof movimentacoesRouter
);
console.log("=================================");


app.use(
    "/api/movimentacoes",

    (req, res, next) => {

        console.log("---------------------------------");
        console.log("MOVIMENTAÇÃO RECEBIDA");
        console.log("METHOD:", req.method);
        console.log("URL:", req.originalUrl);
        console.log("BODY:", req.body);
        console.log("---------------------------------");

        next();

    },

    movimentacoesRouter
);


// =====================================================
// PAINEL
// =====================================================

app.use(
    "/api/painel",
    painelRouter
);


// =====================================================
// ROTA NÃO ENCONTRADA
// =====================================================

app.use((req, res) => {

    console.log("=================================");
    console.log("404 - ROTA NÃO ENCONTRADA");
    console.log("METHOD:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("=================================");

    res.status(404).json({

        erro: "Rota não encontrada.",

        rota: req.originalUrl,

        metodo: req.method

    });

});


// =====================================================
// TRATAMENTO DE ERROS
// =====================================================

app.use((erro, req, res, next) => {

    console.error("=================================");
    console.error("ERRO INTERNO TASKUP");
    console.error("=================================");

    console.error(erro);

    res.status(500).json({

        erro: "Erro interno do servidor.",

        mensagem: erro.message

    });

});


// =====================================================
// EXECUÇÃO LOCAL
// =====================================================

if (process.env.NODE_ENV !== "production") {

    const PORT =
        process.env.PORT || 3000;

    app.listen(PORT, () => {

        console.log("=================================");
        console.log("🚀 TASKUP API");
        console.log("=================================");
        console.log(
            `Servidor rodando em http://localhost:${PORT}`
        );
        console.log(
            `API: http://localhost:${PORT}/api`
        );
        console.log(
            `Teste: http://localhost:${PORT}/api/teste`
        );
        console.log(
            `Movimentações: http://localhost:${PORT}/api/movimentacoes`
        );
        console.log("=================================");

    });

}


export default app;
