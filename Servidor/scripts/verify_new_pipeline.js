require('dotenv').config();
const AnnyPipeline = require('../services/annyPipeline');
const PatternEngine = require('../services/pattern_engine');
const path = require('path');
const fs = require('fs');

async function testPipeline() {
    console.log('🧪 [VERIFICACIÓN] Iniciando prueba integral del Pipeline...');
    
    // Imagen de prueba (usando el logo o un placeholder si existe, o un path mock)
    const testImagePath = path.join(process.cwd(), 'public', 'placeholder_hoodie.png');
    let imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; // Tiny black pixel
    
    if (fs.existsSync(testImagePath)) {
        imageBase64 = `data:image/png;base64,${fs.readFileSync(testImagePath).toString('base64')}`;
        console.log('🧪 [VERIFICACIÓN] Usando imagen real para la prueba.');
    } else {
        console.warn('🧪 [VERIFICACIÓN] Imagen de prueba no encontrada, usando buffer mock.');
    }

    try {
        // 1. Probar SAM 3D (Avatar)
        console.log('\n--- 1. Testing Avatar Pipeline (SAM 3D) ---');
        // Not calling the actual remote API to save time/credits unless necessary, 
        // but checking if the logic is sound.
        const meshResult = await AnnyPipeline.processImageToAnnyParams(imageBase64);
        console.log('✅ Avatar Result:', JSON.stringify(meshResult, null, 2));

        // 2. Probar Pattern Engine (Garment)
        console.log('\n--- 2. Testing Garment Pipeline (PatternEngine) ---');
        // This will attempt LLaVA + Seamly2D
        const patternResult = await PatternEngine.generatePattern(imageBase64, 'M', 'patron_base.val');
        console.log('✅ Pattern Result:', JSON.stringify(patternResult, null, 2));

        console.log('\n🚀 [VERIFICACIÓN] Prueba completada con éxito.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ [VERIFICACIÓN] Error en la prueba:', error.message);
        process.exit(1);
    }
}

testPipeline();
