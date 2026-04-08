const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Gradio3DProcessor = require("../helpers/gradio3d_util");
const fs = require("fs");

/**
 * Example usage of the Gradio 3D Processor in Node.js.
 */
async function runExample() {
    // 1. Initialize the processor with human-specific SAM 3D Body
    const bodySpace = process.env.BODY_API_URL || "dev-bjoern/sam3d-body-mcp";
    const processor = new Gradio3DProcessor(bodySpace, process.env.HF_TOKEN);

    // 2. Path to your image (e.g., photo of your body)
    const imagePath = path.join(__dirname, "..", "public", "user_capture_1775651940264.jpg");

    try {
        console.log("Step 1: Reconstructing human body mesh...");
        const result = await processor.generate3D(imagePath, "/reconstruct_body");
        
        // 4. Handle the result
        console.log("Success! 3D model generated.");
        if (result && result.length > 0) {
            console.log(`Your 3D model (GLB) is ready: ${result[0].url}`);
        }

    } catch (error) {
        console.error("Failed to generate 3D model:", error);
    }
}

// 4. Run the example
runExample();
