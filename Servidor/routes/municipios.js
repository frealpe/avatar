const { Router } = require('express');
const { obtenerMunicipios } = require('../controllers/municipios');

const router = Router();

router.get('/', obtenerMunicipios);

module.exports = router;
