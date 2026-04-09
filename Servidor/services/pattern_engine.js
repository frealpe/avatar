const { procesarPrenda, generarEstructuraVAL } = require('./vision_parser');
const { generarArchivoVIT, generarSVG } = require('./seamly_engine');
const path = require('path');
const fs = require('fs');

/**
 * Verifica si el servidor Ollama está en línea.
 * @returns {Promise<boolean>}
 */
async function checkOllamaStatus() {
    const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    const visionModel = process.env.OLLAMA_MODEL_VISION || 'llava';
    const textModel = process.env.OLLAMA_MODEL_TEXT || 'llama3';
    try {
        const response = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
        const data = await response.json();
        const models = (data.models || []).map(m => m.name);
        const visionOk = models.some(m => m.includes(visionModel.split(':')[0]));
        const textOk = models.some(m => m.includes(textModel.split(':')[0]));
        console.log(`🤖 [OLLAMA STATUS] Servidor: ✅ ONLINE (${host})`);
        console.log(`  👁  Vision (${visionModel}): ${visionOk ? '✅ Disponible' : '❌ NO encontrado — se usará talla M por defecto'}`);
        console.log(`  📝 Texto  (${textModel}): ${textOk ? '✅ Disponible' : '❌ NO encontrado — se usará talla M por defecto'}`);
        return { online: true, visionOk, textOk };
    } catch (e) {
        console.warn(`🤖 [OLLAMA STATUS] ❌ OFFLINE — ${e.message}`);
        console.warn(`  ⚠️  Se usarán medidas estándar talla M para continuar el pipeline.`);
        return { online: false, visionOk: false, textOk: false };
    }
}

/**
 * PatternEngine: Orchestrates the transformation of garment images into 
 * parametric Seamly2D patterns.
 */
class PatternEngine {
    /**
     * Executes the full garment pipeline.
     * @param {string} imagePath - User photo path.
     * @param {string} talla - Expected size (S, M, L).
     * @param {string} patronBaseName - Filename of the master .val pattern.
     * @returns {Promise<Object>} Results including SVG URL and parameters.
     */
    static async generatePattern(imagePath, talla = 'M', patronBaseName = 'patron_base.val') {
        console.log('🧵 [PATTERN ENGINE] Starting garment pipeline...');
        
        try {
            // 0. Verificar estado de los modelos de IA
            await checkOllamaStatus();

            // 1. Analyze image and extract parameters (LLaVA + Garment Analyzer)
            const resultIa = await procesarPrenda(imagePath, talla);
            console.log('🧵 [PATTERN ENGINE] Garment parameters extracted:', resultIa.parametros);

            const publicPatterns = path.join(process.cwd(), 'public', 'patterns');
            if (!fs.existsSync(publicPatterns)) {
                fs.mkdirSync(publicPatterns, { recursive: true });
            }

            const timestamp = Date.now();
            // CRÍTICO: Nombre fijo para que patron_base.val siempre encuentre las medidas.
            const vitPath = path.join(publicPatterns, `medidas_activas.vit`);
            const valPath = path.join(publicPatterns, patronBaseName);

            // 2. Generate .vit file (SeamlyMe format) — nombre fijo para que .val lo encuentre
            const archivoVit = generarArchivoVIT(resultIa.parametros, vitPath);
            console.log('🧵 [PATTERN ENGINE] .vit generado (medidas_activas.vit):', archivoVit);

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
