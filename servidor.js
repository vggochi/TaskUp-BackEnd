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

app.use(cors());

app.use(express.json());

app.get("/api/teste", (req, res) => {
    res.json({
        sucesso: true,
        mensagem: "Servidor TaskUp atualizado",
        timestamp: new Date().toISOString()
    });
});


// ==========================================
// ROTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {

    res.status(200).json({
        nome: "TaskUp API",
        versao: "1.0.0",
        status: "online"
    });

});


// ==========================================
// API
// ==========================================

app.get("/api", (req, res) => {

    res.status(200).json({
        nome: "TaskUp API",
        status: "online",
        mensagem: "API funcionando corretamente."
    });

});


// ==========================================
// ROTAS
// ==========================================

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

console.log("=================================");
console.log("ROTA DE MOVIMENTAÇÕES CARREGADA");
console.log("movimentacoesRouter:", typeof movimentacoesRouter);
console.log("=================================");
app.use(
    "/api/movimentacoes",
    (req, res, next) => {
        console.log("MOVIMENTAÇÃO:", req.method, req.originalUrl);
        next();
    },
    movimentacoesRouter
);

app.use(
    "/api/painel",
    painelRouter
);


// ==========================================
// ROTA NÃO ENCONTRADA
// ==========================================

app.use((req, res) => {

    res.status(404).json({
        erro: "Rota não encontrada.",
        rota: req.originalUrl
    });

});


// ==========================================
// TRATAMENTO DE ERROS
// ==========================================

app.use((erro, req, res, next) => {

    console.error("ERRO:", erro);

    res.status(500).json({
        erro: "Erro interno do servidor.",
        mensagem: erro.message
    });

});


// ==========================================
// EXECUÇÃO LOCAL
// ==========================================

if (process.env.NODE_ENV !== "production") {

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {

        console.log(
            `🚀 TaskUp API rodando em http://localhost:${PORT}`
        );

    });

}


export default app;
