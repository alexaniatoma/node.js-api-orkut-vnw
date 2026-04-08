require('dotenv').config();
const express = require('express');
const pool = require('./config/db');
const validarUsuarios = require('./validacao/usuarios');
const validarPost = require('./validacao/post');
const jwt = require('jsonwebtoken');
const autenticarToken = require('./auth/authLogin');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
    });
}

// POST cadastro de usuario
app.post('/usuarios', validarUsuarios, async (req, res) => {
    try {
        const {nome, email, senha} = req.body;

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await pool.query( `
            INSERT INTO usuarios (nome, email, senha)
            VALUES($1, $2, $3)
            RETURNING *            
        `,
        [nome, email, senhaHash]
    );
    res.status(201).json ( {
        mensagem: "Usuario criado com sucesso",
        usuario: resultado.rows[0]
    })
    } catch (erro) {
        res.status(500).json ({
            mensagem: "Erro ao criar usuario"
        });
    }
});

//POST do login
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    const usuario = await pool.query( `
        SELECT * FROM usuarios WHERE email=$1 `,
        [email]);

        if(usuario.rows.length === 0) {
            return res.status(401).json({ mensagem: "Usuario não encontrado" });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.rows[0].senha);
    
        if(!senhaValida) {
            return res.status(401).json({ mensagem: "Senha inválida" });
    }

    const token = jwt.sign({ id: usuario.rows[0].id, nome: usuario.rows[0].nome } , process.env.JWT_SECRET, { expiresIn: '1h' });

 res.json({token});

});

app.get('/', (req, res) => {
    res.send("<h1>Rede Social!</h1>")
});

app.get('/usuarios' , async (req, res) =>{
    try {
        const resultado = await pool.query ( `
            SELECT * FROM usuarios;
         `);
         res.json(resultado.rows)
    }catch(erro) {
        res.status(500).json({ erro: 'Erro ao buscar dados dos usuarios' })
    }
});

//GET das postagens
app.get('/postagem', async(req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                usuarios.id AS id_usuario,
                usuarios.nome,
                postagem.titulo,
                postagem.conteudo,
                postagem.criado_em,
                postagem.id AS postagem_id
            FROM postagem
            JOIN usuarios 
            ON postagem.usuario_id = usuarios.id
            ORDER BY postagem.criado_em DESC
        `);

        const dados = resultado.rows.map((postagem) => ({
            ...postagem,
            criado_em: formatarData(postagem.criado_em),
        }));

        res.json(dados);      

    } catch(erro){
        console.error('Erro ao buscar postagens', erro);
        res.status(500).json({erro: 'Erro ao buscar as postagens.'});        
    }
});

//POST criar nova postagem
app.post('/postagem', autenticarToken, validarPost, async (req, res) => {
    try {
        const { titulo, conteudo } = req. body;
        const resultado = await pool.query (`
            INSERT INTO postagem (titulo, conteudo, usuario_id)
            VALUES($1, $2, $3) 
            RETURNING * 
            `,
            [titulo, conteudo, req.usuario.id],
        );
        res.status(201).json({ mensagem: "Postagem criada com sucesso!", postagem: resultado.rows[0] });

    } catch(erro) {
        res.status(500).json({ erro: 'Erro ao criar a postagem.' });
    }
});

//UPDATE atualizar postagem
app.put('/postagem/:id', autenticarToken, validarPost, async (req, res) => {
    try {
        const {id}  = req.params;
        const { titulo, conteudo } = req.body;

        const postagem = await pool.query(`
            SELECT * FROM postagem WHERE id=$1 `, [id]);

            if(postagem.length === 0) {
                return res.status(404).json({ mensagem: 'Postagem não encontrada' });
            }

            if(postagem.rows[0].usuario_id !== req.usuario.id) {
                return res.status(403).json( { mensagem: 'Você não tem permissão para atualizar esta postagem' });
            }

        const resultado = await pool.query( `
            UPDATE postagem 
            SET titulo=$1, conteudo=$2 
            WHERE id=$3 RETURNING *
        `, 
        [titulo, conteudo, id]
        );
       res.status(200).json({ mensagem: 'Postagem atualizado com sucesso' , postagem: resultado.rows[0] }) 
    }catch (erro) {
        res.status(500).json({ erro : 'Erro ao atualizar a postagem'});   
    }
});

//DELETE deletar postagem
app.delete('/postagem/:id/', autenticarToken, async (req, res) => {
    try {
        const { id } = req.params;
         const postagem = await pool.query(`
            SELECT * FROM postagem WHERE id=$1 `, [id]);

            if(postagem.length === 0) {
                return res.status(404).json({ mensagem: 'Postagem não encontrada' });
            }

            if(postagem.rows[0].usuario_id !== req.usuario.id) {
                return res.status(403).json( { mensagem: 'Você não tem permissão para deletar esta postagem' })
            }

        const resultado = await pool.query(`
            DELETE FROM postagem WHERE id=$1 RETURNING *                
        `,
        [id],
        );
        res.status(200).json({ mensagem: 'Postagem deletada com sucesso', postagem: resultado.rows[0]})
    }catch (erro) {
        res.status(500).json ({erro: 'Erro ao deletar a postagem'})    
    }
});

module.exports = app;
