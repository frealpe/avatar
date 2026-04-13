const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Service to execute Blender headless for mesh healing (closing holes, remeshing).
 */
class HealingService {
    /**
     * Heals a GLB file by closing holes and optimizing topology.
     * @param {string} inputPath Absolute path to the .glb file
     * @returns {Promise<string>} Path to the healed file (overwritten or new)
     */
    static async healMesh(inputPath) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(inputPath)) {
                return reject(new Error(`File not found: ${inputPath}`));
            }

            const scriptPath = path.join(process.cwd(), 'blender', 'heal_asset.py');
            const command = `blender -b -P "${scriptPath}" -- "${inputPath}"`;

            console.log(`[HEALING SERVICE] Executing: ${command}`);

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[HEALING SERVICE] Error: ${error.message}`);
                    return reject(error);
                }
                
                if (stderr && stderr.includes('Error')) {
                    console.warn(`[HEALING SERVICE] Blender Warning/Error: ${stderr}`);
                }

                console.log(`[HEALING SERVICE] Success: Mesh healed.`);
                resolve(inputPath);
            });
        });
    }
}

module.exports = HealingService;
