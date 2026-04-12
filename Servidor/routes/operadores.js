const { Router } = require('express');
const { 
    obtenerOperadores, 
    crearOperador, 
    actualizarOperador, 
    eliminarOperador 
} = require('../controllers/operadores');

const router = Router();

router.get('/', obtenerOperadores);
router.post('/', crearOperador);
router.put('/:id', actualizarOperador);
router.delete('/:id', eliminarOperador);

module.exports = router;
