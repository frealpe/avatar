const { Router } = require('express');

// Importación de los controladores para las rutas de usuarios
const { usuariosGet,
        usuariosPut,
        usuariosPost,
        usuariosDelete } = require('../controllers/usuarios');

const router = Router();

/**
 * @route GET /
 * Obtiene una lista de usuarios.
 */
router.get('/', usuariosGet );

/**
 * @route PUT /:id
 * Actualiza un usuario existente por su ID.
 */
router.put('/:id', usuariosPut );

/**
 * @route POST /
 * Crea un nuevo usuario.
 */
router.post('/', usuariosPost );

/**
 * @route DELETE /:id
 * Elimina un usuario.
 */
router.delete('/:id', usuariosDelete );

module.exports = router;