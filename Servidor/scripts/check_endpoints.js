const { Client } = require("@gradio/client");

async function check() {
    try {
        const client = await Client.connect("microsoft/TRELLIS");
        const info = await client.view_api();
        const targets = ['/start_session', '/preprocess_image', '/image_to_3d', '/extract_glb'];
        for (const ep of targets) {
             console.log(`=== ${ep} ===`);
             console.log(JSON.stringify(info.named_endpoints[ep], null, 2));
        }
    } catch (e) {
        console.error("Diagnosis failed:", e);
    }
}
check();
