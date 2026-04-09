const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { generarArchivoVIT, generarArchivoVAL, generarSVG } = require('../services/seamly_engine');
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
        // Step 1: Generate Seamly2D Files
        console.log('🧵 [TESTER] Step 1: Generating Seamly2D pattern files...');
        generarArchivoVIT(params, vitPath);
        generarArchivoVAL(params, path.basename(vitPath), valPath);

        // Step 2: Export SVG
        console.log('🎨 [TESTER] Step 2: Exporting SVG from Seamly2D...');
        await generarSVG(vitPath, valPath, outputDir, params);

        // Find the generated SVG
        const svgFiles = fs.readdirSync(outputDir)
            .filter(f => f.startsWith(`test_pattern_${timestamp}`) && f.endsWith('.svg'));
        
        if (svgFiles.length === 0) {
            throw new Error('SVG generation failed or file not found.');
        }
        const svgPath = path.join(outputDir, svgFiles[0]);
        console.log(`✅ [TESTER] SVG Ready: ${svgPath}`);

        // Step 3: Run Blender Simulation
        console.log('🤖 [TESTER] Step 3: Triggering Blender simulation...');
        const result = await generarPrenda3D({
            avatarPath,
            svgPath,
            outputName
        });

        console.log('\n================================================');
        console.log('🎉 [TESTER] PIPELINE TEST SUCCESSFUL');
        console.log(`📍 FINAL GLB URL: ${result.glbPrendaUrl}`);
        console.log(`📍 LOCAL PATH: ${path.join(outputDir, outputName)}`);
        console.log('================================================\n');

    } catch (error) {
        console.error('❌ [TESTER] Pipeline failed:', error.message);
    }
}

runTest();

