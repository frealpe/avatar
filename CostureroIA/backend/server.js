const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the generated 3D assets statically
app.use('/assets', express.static(path.join(__dirname, '..', '3d_assets')));

// Setup multer for image upload handling
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `input_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

app.post('/generate', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }

    const inputImagePath = req.file.path;
    const outputFilename = `output_${Date.now()}.glb`;
    const outputGlbPath = path.join(__dirname, '..', '3d_assets', outputFilename);
    const scriptPath = path.join(__dirname, '..', 'ai_engine', 'main.py');

    console.log(`[+] Received request to process: ${inputImagePath}`);
    console.log(`[+] Output will be saved to: ${outputGlbPath}`);

    // Execute the Python Pipeline Orchestrator
    const pythonProcess = spawn('python3', [scriptPath, inputImagePath, outputGlbPath]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python]: ${data.toString()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python ERROR]: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        if (code === 0 && fs.existsSync(outputGlbPath)) {
            // Clean up uploaded file
            fs.unlinkSync(inputImagePath);

            res.status(200).json({
                message: "Pipeline completed successfully",
                modelUrl: `http://localhost:${port}/assets/${outputFilename}`
            });
        } else {
            res.status(500).json({ error: 'Failed to process pipeline or generate model' });
        }
    });
});

app.listen(port, () => {
    console.log(`Costurero IA Backend running on http://localhost:${port}`);
});
