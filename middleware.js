export function asyncHandler(fn) {

    return function handler(req, res, next) {

        Promise
            .resolve(fn(req, res, next))
            .catch(next);

    };

}


export function validarSKU(sku) {

    if (
        typeof sku !== "string" ||
        !sku.trim()
    ) {

        const erro = new Error(
            "SKU é obrigatório."
        );

        erro.status = 400;

        throw erro;
    }

    return sku.trim();

}


export function validarQuantidade(quantidade) {

    const valor = Number(quantidade);

    if (
        !Number.isInteger(valor) ||
        valor <= 0
    ) {

        const erro = new Error(
            "A quantidade deve ser um número inteiro maior que zero."
        );

        erro.status = 400;

        throw erro;
    }

    return valor;

}


export function validarUUID(id) {

    const regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
        typeof id !== "string" ||
        !regex.test(id)
    ) {

        const erro = new Error(
            "ID inválido."
        );

        erro.status = 400;

        throw erro;
    }

    return id;

}
