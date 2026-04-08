const { Router } = require('express');
const { exportarSVG, modificarParametrosIA } = require('../controllers/patterns');

const router = Router();

// Endpoint para probar el flujo END-TO-END de React
// POST /api/patterns/export-svg
router.post('/export-svg', exportarSVG);

// Endpoint para modificar parámetros con lenguaje natural
// POST /api/patterns/text-to-fit
router.post('/text-to-fit', modificarParametrosIA);

module.exports = router;
