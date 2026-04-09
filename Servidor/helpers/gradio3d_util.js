const { Client, handle_file } = require("@gradio/client");
const fs = require("fs");
const path = require("path");

/**
 * Utility class to interact with Gradio Image-to-3D Spaces.
 */
class Gradio3DProcessor {
    /**
     * @param {string} spaceId The Hugging Face Space ID (e.g., 'tencent/Hunyuan3D-2')
     * @param {string} hfToken Optional Hugging Face token for private or rate-limited spaces
     */
    constructor(spaceId = "tencent/Hunyuan3D-2", hfToken = null) {
        this.spaceId = spaceId;
        this.hfToken = hfToken;
        this.client = null;
    }

    /**
     * Connect to the Gradio Space.
     */
    async connect() {
        if (!this.client) {
            console.log(`Connecting to Gradio Space: ${this.spaceId}...`);
            this.client = await Client.connect(this.spaceId, {
                hf_token: this.hfToken
            });
            console.log("Connected successfully.");
            
            // Check if /start_session is required
            const info = await this.client.view_api();
            if (info && info.named_endpoints && info.named_endpoints['/start_session']) {
                console.log("Starting session on the remote space...");
                await this.client.predict("/start_session");
                console.log("Session started successfully.");
            }
        }
    }

    /**
     * Generate a 3D model from an image.
     * @param {string|Buffer|Blob} imageInput Path to local image, Buffer, or Blob
     * @param {string} apiEndpoint The API endpoint name (default: '/predict')
     * @param {Object} extraParams Additional parameters for the specific model
     * @returns {Promise<Object>} The result from the Gradio API
     */
    async generate3D(imageInput, apiEndpoint = "/predict", extraParams = {}, retryCount = 0) {
        await this.connect();

        // Handle the file input correctly for Node.js
        let processedInput = imageInput;
        if (typeof imageInput === "string" || Buffer.isBuffer(imageInput) || imageInput instanceof Blob) {
            processedInput = handle_file(imageInput);
        }

        console.log(`Sending data to ${this.spaceId} [${apiEndpoint}] (Attempt ${retryCount + 1})...`);
        
        try {
            // Simplificado: Solo manejamos el endpoint de reconstrucción corporal o genérico
            let payload;
            if (apiEndpoint === '/reconstruct_body' || apiEndpoint === '/predict') {
                payload = { image: processedInput, ...extraParams };
            } else {
                payload = { image: processedInput, ...extraParams };
            }

            console.log(`[${apiEndpoint}] Preparing payload and initiating Gradio call...`);
            
            // Try using predict() for a more direct HTTP-based call if submit() hangs
            // predict() returns a promise that resolves when the job is done.
            console.log(`[${apiEndpoint}] Using predict() for direct processing...`);
            const prediction = await this.client.predict(apiEndpoint, payload);
            
            console.log(`[${apiEndpoint}] Success! Prediction received.`);
            return prediction.data;

        } catch (error) {
            console.error(`❌ Gradio Error [${apiEndpoint}]:`, error.message);
            
            const isSessionError = error.message && error.message.includes("Session not found");
            const isSocketError = error.message && (error.message.includes("terminated") || error.message.includes("socket"));

            if ((isSessionError || isSocketError) && retryCount < 2) {
                console.warn(`Connection issue: ${error.message}. Retrying with fresh client...`);
                this.client = null; // Force reconnection
                return this.generate3D(imageInput, apiEndpoint, extraParams, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Download the resulting 3D model if it's a file path or URL.
     * @param {string} resultPath 
     * @param {string} outputPath 
     */
    async saveModel(resultPath, outputPath) {
        // Implementation for saving the file if it's a URL or temp path
        console.log(`Model generated at: ${resultPath}`);
        // If resultPath is a URL, you might need to fetch it.
        // Gradio often returns local temp paths or URLs.
    }
}

module.exports = Gradio3DProcessor;
