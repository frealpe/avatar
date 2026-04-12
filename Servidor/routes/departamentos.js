const { Router } = require('express');
const { obtenerDepartamentos } = require('../controllers/departamentos');

const router = Router();

router.get('/', obtenerDepartamentos);

module.exports = router;
