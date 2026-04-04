const { Client } = require("@gradio/client");

async function diagnose() {
    try {
        console.log("Connecting...");
        const client = await Client.connect("microsoft/TRELLIS");
        console.log("Connected.");
        
        // Just a dummy call to see what submit returns
        const job = client.submit("/preprocess_image", { image: null });
        console.log("Type of job:", typeof job);
        console.log("Job properties:", Object.keys(job));
        console.log("Is job.on a function?", typeof job.on === "function");
        
        if (job[Symbol.asyncIterator]) {
            console.log("Job is an async iterator!");
        }
    } catch (e) {
        console.error("Diagnosis failed:", e);
    }
}

diagnose();
