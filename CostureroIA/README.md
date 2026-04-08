# Costurero IA Digital

An end-to-end pipeline that takes an image of a person wearing clothes, detects the clothing automatically, and generates a 3D avatar with clothing simulated on it using AI and Blender.

## Architecture

This project is separated into three components:

1. **AI Engine (Python)**: Handles image processing (Pose estimation, Segmentation, Clothing type detection) and Blender script execution. Currently implements mocks/stubs for heavy AI libraries to ensure out-of-the-box runnability without a GPU.
2. **Backend (Node.js)**: Orchestrates the pipeline execution and serves the resulting 3D models.
3. **Frontend (React)**: User interface for uploading images and rendering the generated 3D `.glb` files.

## Prerequisites

- Node.js (v18+)
- Python 3.8+
- npm

## Setup & Running

A helper script is provided to automatically install all dependencies and start both servers.

1. Ensure you have execute permissions on the script:
   ```bash
   chmod +x run.sh
   ```

2. Execute the setup script:
   ```bash
   ./run.sh
   ```

This will start the backend on `http://localhost:3000` and the frontend on `http://localhost:5173`. Open the frontend URL in your browser to try it out.
