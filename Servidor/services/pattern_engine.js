const { procesarPrenda, generarEstructuraVAL } = require('./vision_parser');
const { generarArchivoVIT, generarSVG } = require('./seamly_engine');
const path = require('path');
const fs = require('fs');

/**
 * PatternEngine: Orchestrates the transformation of garment images into 
 * parametric Seamly2D patterns.
 */
class PatternEngine {
    /**
     * Executes the full garment pipeline.
     * @param {string} imageBase64 - User photo in base64.
     * @param {string} talla - Expected size (S, M, L).
     * @param {string} patronBaseName - Filename of the master .val pattern.
     * @returns {Promise<Object>} Results including SVG URL and parameters.
     */
    static async generatePattern(imageBase64, talla = 'M', patronBaseName = 'patron_base.val') {
        console.log('🧵 [PATTERN ENGINE] Starting garment pipeline...');
        
        try {
            // 1. Analyze image and extract parameters (LLaVA + Llama 3)
            const resultIa = await procesarPrenda(imageBase64, talla);
            console.log('🧵 [PATTERN ENGINE] Garment parameters extracted:', resultIa.parametros);

            const publicPatterns = path.join(process.cwd(), 'public', 'patterns');
            if (!fs.existsSync(publicPatterns)) {
                fs.mkdirSync(publicPatterns, { recursive: true });
            }

            const timestamp = Date.now();
            const vitPath = path.join(publicPatterns, `medidas_${timestamp}.vit`);
            const valPath = path.join(publicPatterns, patronBaseName);

            // 2. Generate .vit file (SeamlyMe format)
            const archivoVit = generarArchivoVIT(resultIa.parametros, vitPath);
            console.log('🧵 [PATTERN ENGINE] .vit file generated:', archivoVit);

            // 3. Optional: Generate dynamic .val structure using Llama 3 
            // If the base pattern doesn't exist, we try to generate one from scratch
            let finalValPath = valPath;
            if (!fs.existsSync(valPath)) {
                console.warn(`🧵 [PATTERN ENGINE] Base pattern ${patronBaseName} not found. Generating dynamic structure...`);
                const dynamicValContent = await generarEstructuraVAL(resultIa.descripcion, resultIa.parametros);
                if (dynamicValContent) {
                    finalValPath = path.join(publicPatterns, `dynamic_${timestamp}.val`);
                    fs.writeFileSync(finalValPath, dynamicValContent, 'utf8');
                } else {
                    throw new Error('Could not generate base pattern structure.');
                }
            }

            // 4. Export SVG (Seamly2D CLI Headless)
            console.log('🧵 [PATTERN ENGINE] Exporting to SVG...');
            await generarSVG(archivoVit, finalValPath, publicPatterns);
            
            const svgName = path.basename(finalValPath, '.val') + '.svg';
            const svgURL = `/patterns/${svgName}`;
            const absoluteSvgPath = path.join(publicPatterns, svgName);

            return {
                ok: true,
                url: svgURL,
                absoluteSvgPath,
                params: resultIa.parametros,
                description: resultIa.descripcion
            };

        } catch (error) {
            console.error('❌ [PATTERN ENGINE] Error:', error.message);
            throw error;
        }
    }
}

module.exports = PatternEngine;
