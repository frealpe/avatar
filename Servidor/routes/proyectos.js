const { Router } = require('express');
const { obtenerProyectos, crearProyecto, actualizarProyecto, eliminarProyecto } = require('../controllers/proyectos');

const router = Router();

router.get('/', obtenerProyectos);
router.post('/', crearProyecto);
router.put('/:id', actualizarProyecto);
router.delete('/:id', eliminarProyecto);

module.exports = router;
