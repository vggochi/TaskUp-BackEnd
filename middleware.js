export function asyncHandler(funcao) {
    return (requisicao, resposta, proximo) => {
        Promise
            .resolve(funcao(requisicao, resposta, proximo))
            .catch(proximo);
    };
}


export function validarSKU(sku) {

    if (
        typeof sku !== "string" ||
        !/^\d{3}\.\d{3}\.\d{4}$/.test(sku)
    ) {

        const erro = new Error(
            "SKU inválido. O formato deve ser FFF.TTT.PPPP."
        );

        erro.status = 400;

        throw erro;
    }

    return sku;
}


export function validarQuantidade(valor, nomeCampo = "quantidade") {

    const quantidade = Number(valor);

    if (
        !Number.isFinite(quantidade) ||
        quantidade <= 0 ||
        !Number.isInteger(quantidade)
    ) {

        const erro = new Error(
            `${nomeCampo} deve ser um número inteiro maior que zero.`
        );

        erro.status = 400;

        throw erro;
    }

    return quantidade;
}