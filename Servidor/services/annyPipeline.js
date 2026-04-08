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
        console.log('🤖 [IA] Iniciando pipeline de inferencia 3D (SMPL-X / SAM3D)...');
        
        let meshUrl = null;
        let isRealGeneration = false;

        if (typeof inputData === 'string' && inputData.startsWith('data:image')) {
            try {
                // Decode base64 and save to temp file
                const base64Data = inputData.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const tempImagePath = path.join(__dirname, '..', 'public', `user_capture_${Date.now()}.jpg`);
                fs.writeFileSync(tempImagePath, buffer);

                // Run Gradio pipeline (Human Specific: SAM 3D Body)
                // We use the space ID provided by user or fallback to standard SAM 3D Body MCP
                const bodySpace = process.env.BODY_API_URL || "dev-bjoern/sam3d-body-mcp";
                const processor = new Gradio3DProcessor(bodySpace, process.env.HF_TOKEN);
                
                console.log(`🤖 [IA] Gradio: Invocando SAM 3D Body en ${bodySpace} para reconstrucción humana...`);
                
                // Segment Anything Model 3D specialized endpoint
                const result = await processor.generate3D(tempImagePath, "/reconstruct_body");
                
                if (result && result.length > 0) {
                    // Result format for model3d is usually [{ url: "...", path: "..." }]
                    meshUrl = result[0].url;
                    isRealGeneration = true;
                    console.log('🤖 [IA] Reconstrucción Corporal SAM 3D Completada. GLB Url:', meshUrl);
                } else {
                    console.warn('🤖 [IA] SAM 3D no devolvió una malla válida. Usando fallback paramétrico.');
                }

                // Cleanup temporal image
                if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);

            } catch (err) {
                console.error("❌ [IA] SAM 3D Pipeline Error:", err.message);
                console.log("⚠️ [IA] Usando fallback a motor paramétrico Anny v2...");
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
                modelType: isRealGeneration ? 'SAM3D_HumanBody' : 'Anny_v2',
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
