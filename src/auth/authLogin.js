const jwt = require('jsonwebtoken');

function autenticarToken(req, res, next) {
    const token = req.headers.authorization;

    if(!token) {
        return res.status(401).json({ mensagem: "Token não fornecido" });
    }

    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.usuario = decoded;
        console.log(req.usuario);
        next();
    } catch (erro) {
        return res.status(401).json({ mensagem: "Token inválido" });
    }
}

module.exports = autenticarToken;