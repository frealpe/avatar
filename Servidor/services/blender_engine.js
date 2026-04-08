const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Executes Blender in headless mode to simulate a 3D garment over an avatar.
 *
 * @param {Object} params
 * @param {string} params.avatarPath - Absolute path to the avatar .glb
 * @param {string} params.svgPath - Absolute path to the pattern .svg
 * @param {string} params.outputName - Desired name for the output .glb (e.g., 'prenda_final.glb')
 * @returns {Promise<{glbPrendaUrl: string}>}
 */
async function generarPrenda3D({ avatarPath, svgPath, outputName }) {
    return new Promise((resolve, reject) => {
        try {
            const publicPatternsDir = path.join(process.cwd(), 'public', 'patterns');

            // Ensure the directory exists
            if (!fs.existsSync(publicPatternsDir)) {
                fs.mkdirSync(publicPatternsDir, { recursive: true });
            }

            const outputPath = path.join(publicPatternsDir, outputName);
            const scriptPath = path.join(process.cwd(), 'blender', 'script.py');

            // blender -b -P blender/script.py -- avatar.glb pattern.svg output.glb
            const command = `blender -b -P "${scriptPath}" -- "${avatarPath}" "${svgPath}" "${outputPath}"`;

            console.log(`[BLENDER ENGINE] Starting headless simulation: ${command}`);

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[BLENDER ENGINE] Error executing Blender: ${error.message}`);
                    console.error(`[BLENDER ENGINE] Stderr: ${stderr}`);
                    return reject(error);
                }

                console.log(`[BLENDER ENGINE] Simulation completed. Stdout: ${stdout}`);

                // Return relative URL assuming public is the static root
                const glbPrendaUrl = `/patterns/${outputName}`;
                resolve({ glbPrendaUrl });
            });
        } catch (err) {
            console.error(`[BLENDER ENGINE] Exception in generarPrenda3D: ${err}`);
            reject(err);
        }
    });
}

module.exports = {
    generarPrenda3D
};
