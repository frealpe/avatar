const { response, request } = require('express');
const bcryptjs = require('bcryptjs');
const Usuario = require('../models/UsuarioModel');

const usuariosGet = async (req = request, res = response) => {
    try {
        const { limite = 50, desde = 0 } = req.query;
        const query = { estado: true };

        const [ total, usuarios ] = await Promise.all([
            Usuario.countDocuments(query),
            Usuario.find(query)
                .populate('proyectos', 'nombre')
                .populate('avatar')
                .skip( Number( desde ) )
                .limit( Number( limite ) )
        ]);

        res.json({
            ok: true,
            total,
            usuarios
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener usuarios'
        });
    }
}

const usuariosPost = async (req, res = response) => {
    try {
        const { nombre, dni, correo, password, rol, celular, proyectos } = req.body;
        const usuario = new Usuario({ nombre, dni, correo, password, rol, celular, proyectos });

        // Encriptar la contraseña
        const salt = bcryptjs.genSaltSync();
        usuario.password = bcryptjs.hashSync( password, salt );

        // Guardar en BD
        await usuario.save();

        res.json({
            ok: true,
            usuario
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear usuario'
        });
    }
}

const usuariosPut = async (req, res = response) => {
    try {
        const { id } = req.params;
        const { _id, password, google, correo, ...resto } = req.body;

        if ( password ) {
            // Encriptar la contraseña
            const salt = bcryptjs.genSaltSync();
            resto.password = bcryptjs.hashSync( password, salt );
        }

        const usuario = await Usuario.findByIdAndUpdate( id, resto, { new: true } );

        res.json({
            ok: true,
            usuario
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar usuario'
        });
    }
}

const usuariosDelete = async (req, res = response) => {
    try {
        const { id } = req.params;
        // Borrado lógico
        const usuario = await Usuario.findByIdAndUpdate( id, { estado: false }, { new: true } );

        res.json({
            ok: true,
            usuario
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al eliminar usuario'
        });
    }
}

module.exports = {
    usuariosGet,
    usuariosPost,
    usuariosPut,
    usuariosDelete,
}