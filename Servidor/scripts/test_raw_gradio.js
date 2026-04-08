const { Client, handle_file } = require("@gradio/client");
const path = require("path");
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testRawGradio() {
    const spaceId = "dev-bjoern/sam3d-body-mcp";
    const hfToken = process.env.HF_TOKEN;
    const imagePath = path.join(__dirname, "..", "public", "user_capture_1775651940264.jpg");
    
    console.log(`Testing raw Gradio on ${spaceId} with token: ${hfToken ? "Yes" : "No"}...`);
    try {
        const client = await Client.connect(spaceId, { hf_token: hfToken });
        console.log("Connected.");
        const file = handle_file(imagePath);
        const result = await client.predict("/reconstruct_body", { image: file });
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

testRawGradio();
