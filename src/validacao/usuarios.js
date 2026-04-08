const Joi = require('joi');

const usuarioSchema = Joi.object({
    nome: Joi.string().min(3).required().messages({
        "string.empty" : "Nome é obrigatório",
        "string.min" : "Nome deve conter pelo menos 3 caracteres",
        "any.required" : "Nome é obrigatório"
    }),
    email: Joi.string().email().required().messages ({
        "string.empty" : "E-mail é obrigatório",
        "string.email" : "E-mail deve ser um e-mail válido",
        "any.required" : "E-mail é obrigatório"

    }),
    senha: Joi.string().min(6).required().messages({
        "string.base" : "Senha deve ser string",
        "string.empty" : "Senha é obrigatório",
        "string.min" : "Senha deve conter pelo menos 6 caracteres",
        "any.required" : "Senha é obrigatório"
    })
})

function validarUsuarios(req, res, next) {
    const { error } = usuarioSchema.validate(req.body, { abortEarly:
        false });
        if(error) {
            console.log(error)
            return res.status(400).json( {
                erro: error.details.map((e)=> e.message),
            })
    }
    next()
}

module.exports = validarUsuarios;