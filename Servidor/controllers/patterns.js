const path = require('path');
const fs = require('fs');
const { procesarPrenda } = require('../services/vision_parser');
const { generarArchivoVIT, generarSVG } = require('../services/seamly_engine');

const exportarSVG = async (req, res) => {
    // 1. Extraemos los campos desde un frontend (ej React manda el base64 de la imagen o su ruta)
    // También enviaría el patrón maestro ("camisa.val") a aplicar.
    const { imageBase64, imagePath, talla = 'M', patronValName = 'patron_base.val' } = req.body;

    try {
        const inputImage = imageBase64 || imagePath;
        if (!inputImage) {
            return res.status(400).json({ error: 'Falta proveer una imagen (imageBase64 o imagePath).' });
        }

        console.log('[API] Iniciando flujo generativo de patrón a SVG...');

        // 2. Extraer medidas usando los modelos IA (Llama3 y LLaVA)
        const resultadoIa = await procesarPrenda(inputImage, talla);

        // 3. Crear el archivo VIT para Seamly2D en el direcorio público
        const publicPatternsPath = path.join(process.cwd(), 'public', 'patterns');
        if (!fs.existsSync(publicPatternsPath)) fs.mkdirSync(publicPatternsPath, { recursive: true });
        
        const outputVitFile = path.join(publicPatternsPath, `medidas_${new Date().getTime()}.vit`);
        const archivoVit = generarArchivoVIT(resultadoIa.parametros, outputVitFile);

        // 4. Integrar con el archivo .val maestro real
        // Asumimos que el front pidió modificar un '.val' que existe en una ruta
        const patronValLocation = path.join(publicPatternsPath, patronValName);
        if (!fs.existsSync(patronValLocation)) {
            return res.status(404).json({ 
                error: `Falta el Patrón Base (.val) en ${patronValLocation}. Sube uno a esa ruta para completar la fase SVG.`,
                ia_descripcion: resultadoIa.descripcion,
                ia_medias: resultadoIa.parametros,
                archivo_vit_generado: archivoVit
            });
        }

        // 5. Correr el CLI local de Seamly2D a través del Engine Process
        await generarSVG(archivoVit, patronValLocation, publicPatternsPath);

        // Retornar éxito a React con la posible URL del SVG si se exporta predeciblemente
        // Por lo general Seamly2d lo graba con algun nombre estilo patron_base.svg
        const svgURL = `http://localhost:${process.env.PORT || 8080}/patterns/${patronValName.replace('.val', '.svg')}`;
        
        res.json({
            ok: true,
            msg: 'Patrón paramétrico compilado por la IA local',
            svgUrl: svgURL,
            metadata: resultadoIa
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            ok: false,
            error: error.message 
        });
    }
};

module.exports = {
    exportarSVG
};
