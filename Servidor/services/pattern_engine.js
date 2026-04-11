const { procesarPrenda, generarEstructuraVAL } = require('./vision_parser');
// Note: Seamly2D engine has been removed. Pattern generation that depended on
// Seamly is disabled. Calls to PatternEngine.generatePattern will reject.
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

        // FEATURE REMOVED: Seamly2D-dependent pattern generation is disabled.
        // Fail fast so callers (Workers / scripts) can fallback or skip garment steps.
        throw new Error('Seamly2D integration removed: Pattern generation is disabled in this build.');
        
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
            // CRÍTICO: Nombre fijo para que el .val siempre encuentre las medidas.
            const vitPath = path.join(publicPatterns, `medidas_activas.vit`);
            const valPath = path.join(publicPatterns, `patron_base.val`);

            console.log(`[ENGINE] STATUS: Validando y generando archivos Seamly2D...`);

            // PROTECCIÓN DEL PIPELINE: Validar vit, generar y exportar SVG de forma segura
            let archivoVit;
            try {
                // 2. Generar .vit con sanitización industrial (internamente valida)
                archivoVit = generarArchivoVIT(resultIa.parametros, vitPath);
                console.log(`[ENGINE] STATUS: .vit validado y generado correctamente: ${archivoVit}`);

                // 3. Generar .val DINÁMICAMENTE con valores numéricos literales
                generarArchivoVAL(resultIa.parametros, 'medidas_activas.vit', valPath);
                console.log(`[ENGINE] STATUS: .val generado correctamente.`);

                // 4. Export SVG (Seamly2D CLI Headless)
                console.log(`[ENGINE] STATUS: Ejecutando Seamly2D CLI para SVG...`);
                await generarSVG(vitPath, valPath, publicPatterns, null);

            } catch (engineError) {
                console.error(`[ENGINE] ERROR CRÍTICO: ${engineError.message}`);
                console.log(`[ENGINE] STATUS: Aplicando fallback seguro para el pipeline de patrones...`);
                // Enviar objeto nulo o throw seguro que no rompa el Worker superior
                throw new Error(`Pipeline falló en Seamly2D: ${engineError.message}`);
            }
            
            // The original pipeline returned generated SVG data here, but since
            // Seamly2D is removed we never reach this point. This branch kept for
            // reference; the function fails earlier with a clear error.

        } catch (error) {
            console.error('[ENGINE] STATUS: Error global en Pattern Engine:', error.message);
            throw error; // El worker lo captura y maneja
        }
    }
}

module.exports = PatternEngine;
