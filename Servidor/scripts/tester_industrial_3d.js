const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Seamly2D was removed; pattern generation and SVG export are disabled.
// Require the stub module only to provide a clear error if accidentally called.
const seamlyEngine = require('../services/seamly_engine');
const { generarPrenda3D } = require('../services/blender_engine');
const TrellisService = require('../services/trellis_service');

/**
 * Industrial 3D Pipeline Tester
 * 
 * Allows manual testing of garment parameters and 3D simulation.
 * usage: node scripts/tester_industrial_3d.js [ancho_pecho] [largo_total] [avatar_path_OR_image_path]
 */
async function runTest() {
    console.log('🚀 [TESTER] Starting Industrial 3D Pipeline Test');

    // 1. Setup Parameters
    const params = {
        ancho_pecho: process.argv[2] || '55',
        largo_total: process.argv[3] || '75',
        shoulder_width_cm: '48',
        neck_depth_cm: '10',
        sleeve_length_cm: '25'
    };

    let avatarPath = process.argv[4] || path.join(__dirname, '..', 'public', 'temp', 'recalc_3659b104-0c79-46e8-8d77-7310a2404c93.glb');
    
    // Check if the input is an image and we should use Trellis
    if (avatarPath && (avatarPath.endsWith('.jpg') || avatarPath.endsWith('.png') || avatarPath.endsWith('.jpeg'))) {
        console.log(`🤖 [TESTER] Image detected: ${avatarPath}. Triggering Trellis...`);
        try {
            avatarPath = await TrellisService.generateAvatar(avatarPath);
            console.log(`✅ [TESTER] Trellis Avatar generated: ${avatarPath}`);
        } catch (err) {
            console.error(`❌ [TESTER] Trellis generation failed: ${err.message}`);
            return;
        }
    }

    // Check avatar existence
    if (!fs.existsSync(avatarPath)) {
        console.error(`❌ [TESTER] Avatar not found at: ${avatarPath}`);
        console.log('Please provide a valid avatar path or image path as the 3rd argument.');
        return;
    }

    const outputDir = path.join(__dirname, '..', 'public', 'temp');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = Date.now();
    const vitPath = path.join(outputDir, `test_params_${timestamp}.vit`);
    const valPath = path.join(outputDir, `test_pattern_${timestamp}.val`);
    const outputName = `test_result_${timestamp}.glb`;

    try {
        console.warn('🧵 [TESTER] Seamly2D functionality has been removed. Skipping pattern generation and SVG export.');
        console.warn('If you need to run this test, restore the seamly_engine module or re-enable Seamly2D support.');
        return;
    } catch (error) {
        console.error('❌ [TESTER] Pipeline failed:', error.message);
    }
}

runTest();

