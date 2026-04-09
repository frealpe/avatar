const Gradio3DProcessor = require('../helpers/gradio3d_util');
const path = require('path');
const fs = require('fs');

/**
 * TrellisService
 * 
 * Specialized service to handle 3D reconstruction using Trellis models.
 */
class TrellisService {
    /**
     * Generates a 3D avatar from an image using a Trellis-based Gradio space.
     * @param {string} imagePath Absolute path to the input image.
     * @param {string} [spaceId] Optional specific Gradio Space ID.
     * @returns {Promise<string>} Path to the generated .glb file.
     */
    static async generateAvatar(imagePath, spaceId = null) {
        // Fallback sequence of spaces
        const spaces = spaceId ? [spaceId] : [
            process.env.BODY_API_URL || "dev-bjoern/sam3d-body-mcp",
            "JeffreyXiang/TRELLIS"
        ];
        
        const hfToken = process.env.HF_TOKEN;
        let lastError = null;

        for (const bodySpace of spaces) {
            console.log(`[TRELLIS SERVICE] Intentando generación 3D en: ${bodySpace}`);
            const processor = new Gradio3DProcessor(bodySpace, hfToken);
            
            try {
                // Determine endpoint based on known spaces
                let endpoint = "/predict";
                if (bodySpace.includes('sam3d')) endpoint = "/reconstruct_body";
                if (bodySpace.includes('JeffreyXiang')) endpoint = "/image_to_3d"; // Specific for this space

                const result = await processor.generate3D(imagePath, endpoint);
                
                if (result && result.length > 0) {
                    // Normalize result access (JeffreyXiang returns paths directly sometimes)
                    let remoteUrl;
                    if (typeof result[0] === 'string') {
                        remoteUrl = result[0];
                    } else if (result[0].url) {
                        remoteUrl = result[0].url;
                    } else if (result.url) {
                         remoteUrl = result.url;
                    } else {
                         // Fallback for some models that return path in data directly
                         remoteUrl = result[0].path || result[0];
                    }

                    const tempName = `trellis_avatar_${Date.now()}.glb`;
                    const localPath = path.join(__dirname, '..', 'public', 'temp', tempName);
                    
                    if (!fs.existsSync(path.dirname(localPath))) {
                        fs.mkdirSync(path.dirname(localPath), { recursive: true });
                    }

                    console.log(`[TRELLIS SERVICE] Descargando avatar desde: ${remoteUrl}`);
                    const response = await fetch(remoteUrl);
                    const buffer = Buffer.from(await response.arrayBuffer());
                    fs.writeFileSync(localPath, buffer);
                    
                    console.log(`[TRELLIS SERVICE] SUCCESS: Avatar guardado en ${localPath}`);
                    return localPath;
                }
            } catch (error) {
                console.warn(`[TRELLIS SERVICE] Falló intento en ${bodySpace}: ${error.message}`);
                lastError = error;
                if (error.message.includes("quota")) {
                    console.error("[TRELLIS SERVICE] Error de cuota detectado. Saltando a siguiente espacio o terminando...");
                }
            }
        }

        throw new Error(`Trellis generation failed after trying all spaces. Last error: ${lastError?.message}`);
    }

}

module.exports = TrellisService;
