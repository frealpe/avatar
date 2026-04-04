const { response, request } = require('express');

/**
 * Maneja las peticiones GET para obtener usuarios.
 * Extrae parámetros de consulta como q, nombre, apikey, page y limit.
 * 
 * @param {request} req - Objeto de petición de Express.
 * @param {response} res - Objeto de respuesta de Express.
 */
const usuariosGet = (req = request, res = response) => {

    const { q, nombre = 'No name', apikey, page = 1, limit } = req.query;

    res.json({
        msg: 'get API - controlador',
        q,
        nombre,
        apikey,
        page, 
        limit
    });
}

/**
 * Maneja las peticiones POST para crear un nuevo usuario.
 * Extrae nombre y edad del cuerpo de la petición.
 * 
 * @param {request} req - Objeto de petición de Express con el body del usuario.
 * @param {response} res - Objeto de respuesta de Express.
 */
const usuariosPost = (req, res = response) => {

    const { nombre, edad } = req.body;

    res.json({
        msg: 'post API - usuariosPost',
        nombre, 
        edad
    });
}

/**
 * Maneja las peticiones PUT para actualizar un usuario por su ID.
 * 
 * @param {request} req - Objeto de petición de Express que contiene el ID en los params.
 * @param {response} res - Objeto de respuesta de Express.
 */
const usuariosPut = (req, res = response) => {

    const { id } = req.params;

    res.json({
        msg: 'put API - usuariosPut',
        id
    });
}

/**
 * Maneja las peticiones PATCH para actualizaciones parciales.
 * 
 * @param {request} req - Objeto de petición de Express.
 * @param {response} res - Objeto de respuesta de Express.
 */
const usuariosPatch = (req, res = response) => {
    res.json({
        msg: 'patch API - usuariosPatch'
    });
}

/**
 * Maneja las peticiones DELETE para eliminar un usuario.
 * 
 * @param {request} req - Objeto de petición de Express.
 * @param {response} res - Objeto de respuesta de Express.
 */
const usuariosDelete = (req, res = response) => {
    res.json({
        msg: 'delete API - usuariosDelete'
    });
}

module.exports = {
    usuariosGet,
    usuariosPost,
    usuariosPut,
    usuariosPatch,
    usuariosDelete,
}