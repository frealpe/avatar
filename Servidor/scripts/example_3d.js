const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Gradio3DProcessor = require("../helpers/gradio3d_util");
const fs = require("fs");

/**
 * Example usage of the Gradio 3D Processor in Node.js.
 */
async function runExample() {
    // 1. Initialize the processor with cloud Gradio instance
    const processor = new Gradio3DProcessor("microsoft/TRELLIS", process.env.HF_TOKEN);

    // 2. Path to your image (e.g., photo of your body)
    const imagePath = path.join(__dirname, "..", "public", "body_photo.jpg");

    try {
        console.log("Step 1: Preprocessing image...");
        const preprocessedData = await processor.generate3D(imagePath, "/preprocess_image");
        console.log("Step 1 Result:", JSON.stringify(preprocessedData, null, 2));
        
        const segmentedImage = preprocessedData[0]; // Image without background
        console.log("Step 2: Generating 3D representation...");

        // Generate the 3D model (this returns a state object)
        const stage1Result = await processor.generate3D(segmentedImage, "/image_to_3d", {
            seed: 0,
            ss_guidance_strength: 7.5,
            ss_sampling_steps: 12,
            slat_guidance_strength: 3.0,
            slat_sampling_steps: 12
        });
        console.log("Step 2 Result (State):", JSON.stringify(stage1Result, null, 2));

        console.log("Step 3: Extracting GLB mesh...");
        // stage1Result[0] is the 'state' needed for extraction
        // In TRELLIS, the state might be passed as a hidden parameter or first positional
        const finalResult = await processor.generate3D(stage1Result[0], "/extract_glb", {
            mesh_simplify: 0.95,
            texture_size: 1024
        });

        // 4. Handle the result
        console.log("Success! 3D model generated.");
        if (finalResult && finalResult.length > 0) {
            console.log(`Your 3D model is ready: ${finalResult[0].url}`);
        }

    } catch (error) {
        console.error("Failed to generate 3D model:", error);
    }
}

// 4. Run the example
runExample();
