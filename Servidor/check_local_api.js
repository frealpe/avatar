const { Client } = require("@gradio/client");

async function checkApi() {
    try {
        console.log("Connecting to local Gradio Space...");
        const client = await Client.connect("http://127.0.0.1:7860/");
        
        console.log("Successfully connected!");
        // The API details are usually stored in config.dependencies
        if (client.config && client.config.dependencies) {
            console.log("\nFound Endpoints:");
            client.config.dependencies.forEach((dep, idx) => {
                if (dep.api_name) {
                    console.log(`- /${dep.api_name} (fn_index: ${idx})`);
                } else {
                    console.log(`- [Unnamed] (fn_index: ${idx})`);
                }
            });
        } else {
            console.log("No dependencies/endpoints found in client config.");
        }
    } catch (e) {
        console.error("Failed to connect or fetch API:", e);
    }
}

checkApi();
