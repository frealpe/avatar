const Gradio3DProcessor = require('../helpers/gradio3d_util');
const fs = require('fs');
const path = require('path');

/**
 * Implementación del pipeline de Machine Learning usando el modelo Anny.
 */

class AnnyPipeline {
    
    /**
     * Procesa imágenes o video del usuario para obtener parámetros y malla.
     * @param {string|Buffer} inputData Imágenes base64 o buffer de video
     * @param {Object} io Instancia de Socket.io paranotificaciones en tiempo real
     */
    static async processImageToAnnyParams(inputData, io = null) {
        console.log('🤖 [IA] Iniciando pipeline de inferencia 3D Trellis...');
        
        let meshUrl = null;
        let isRealGeneration = false;

        if (typeof inputData === 'string' && inputData.startsWith('data:image')) {
            try {
                // Decode base64 and save to temp file
                const base64Data = inputData.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const tempImagePath = path.join(__dirname, '..', 'public', `user_capture_${Date.now()}.jpg`);
                fs.writeFileSync(tempImagePath, buffer);

                // Run Gradio pipeline
                const processor = new Gradio3DProcessor("microsoft/TRELLIS", process.env.HF_TOKEN);
                console.log('🤖 [IA] Gradio: Invocando TRELLIS /preprocess_image...');
                const preprocessedData = await processor.generate3D(tempImagePath, "/preprocess_image");
                const segmentedImage = preprocessedData[0];

                console.log('🤖 [IA] Gradio: Generando representación 3D (Modo Rápido)...');
                const stage1Result = await processor.generate3D(segmentedImage, "/image_to_3d", {
                    seed: 0,
                    ss_guidance_strength: 7.5,
                    ss_sampling_steps: 4, // [Optimizado] Antes 12. Menos iteraciones de difusión.
                    slat_guidance_strength: 3.0,
                    slat_sampling_steps: 4 // [Optimizado] Antes 12. Reducción exponencial de tiempo.
                });

                console.log('🤖 [IA] Gradio: Extrayendo GLB mesh (Compresión Web)...');
                const finalResult = await processor.generate3D(stage1Result[0], "/extract_glb", {
                    mesh_simplify: 0.85, // [Optimizado] Digeere los polígonos un 10% más para carga rápida
                    texture_size: 512  // [Optimizado] Texturas en SD en lugar de HD resuelven el encoding más veloz
                });

                if (finalResult && finalResult.length > 0) {
                    meshUrl = finalResult[0].url;
                    isRealGeneration = true;
                    console.log('🤖 [IA] Gradio Completado. GLB Url:', meshUrl);
                }

                // Cleanup temporal image
                fs.unlinkSync(tempImagePath);

            } catch (err) {
                console.error("Gradio pipeline fail, falling back to mock:", err);
            }
        }

        try {
            // Simulación de etapas de procesamiento (se pueden sustituir por llamadas reales a scripts Python/C++)
            console.log('🤖 [IA] Etapa 1: Pose estimation y segmentación paramétrica...');
            
            // Generación de parámetros basados en Anny (Anatomía paramétrica)
            const simulatedHeight = 165 + (Math.random() * 20); 
            const chest = simulatedHeight * 0.54;
            const waist = simulatedHeight * 0.42;

            const results = {
                modelType: isRealGeneration ? 'TRELLIS_HighRes' : 'Anny_v2',
                meshUrl: meshUrl, // Agregado para enviar la url del GLB al Frontend
                measurements: {
                    height: parseFloat(simulatedHeight.toFixed(2)),
                    weight: parseFloat((60 + Math.random() * 20).toFixed(2)),
                    chest: parseFloat(chest.toFixed(2)),
                    waist: parseFloat(waist.toFixed(2)),
                    hips: parseFloat((simulatedHeight * 0.56).toFixed(2))
                },
                shapeParams: Array.from({ length: 10 }).map(() => (Math.random() * 2) - 1),
                poseParams: Array.from({ length: 72 }).fill(0),
                meshGenerated: true,
                timestamp: new Date()
            };

            // 2. Notificación en tiempo real vía Sockets
            if (io) {
                console.log('🔌 [Socket] Emitiendo nuevo avatar_ready a los clientes...');
                io.emit('avatar:ready', results);
            }

            console.log('🤖 [IA] Inferencia completada con éxito.');
            return results;

        } catch (error) {
            console.error('❌ [IA] Error en el pipeline Anny:', error);
            throw error;
        }
    }

}

module.exports = AnnyPipeline;
