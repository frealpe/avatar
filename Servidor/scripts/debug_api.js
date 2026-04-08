const { Client } = require("@gradio/client");

async function debugApi() {
    const spaceId = "dev-bjoern/sam3d-body-mcp";
    const client = await Client.connect(spaceId);
    const info = await client.view_api();
    console.log(JSON.stringify(info, null, 2));
}

debugApi();
