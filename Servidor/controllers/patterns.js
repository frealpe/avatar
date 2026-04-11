const path = require('path');
const fs = require('fs');
const { procesarPrenda } = require('../services/vision_parser');
// Seamly2D engine removed; no direct dependency here.

const exportarSVG = async (req, res) => {
    // 1. Extraemos los campos desde un frontend (ej React manda el base64 de la imagen o su ruta)
    // También enviaría el patrón maestro ("camisa.val") a aplicar.
    const { imageBase64, imagePath, talla = 'M', patronValName = 'patron_base.val' } = req.body;

    // Seamly2D functionality removed
    return res.status(501).json({
        ok: false,
        error: 'Seamly2D integration has been removed from this build. Pattern export to SVG is disabled.'
    });
};

module.exports = {
    exportarSVG
};
