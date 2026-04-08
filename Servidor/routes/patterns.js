const { Router } = require('express');
const { exportarSVG } = require('../controllers/patterns');

const router = Router();

// Endpoint para probar el flujo END-TO-END de React
// POST /api/patterns/export-svg
router.post('/export-svg', exportarSVG);

module.exports = router;
