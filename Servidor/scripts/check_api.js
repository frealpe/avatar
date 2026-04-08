const { Client } = require("@gradio/client");
async function check() {
    const client = await Client.connect("microsoft/TRELLIS");
    const info = await client.view_api();
    console.log(JSON.stringify(info, null, 2));
}
check();
