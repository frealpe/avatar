const Avatar = require('../models/AvatarModel');
const { avatarQueue } = require('../helpers/queue');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const v4 = require('uuid').v4;

const generateAvatar = async (req, res) => {
    try {
        const { imageBase64, userId = 'mobile_user_01', talla = 'M', patronValName = 'patron_base.val', target = 'both' } = req.body;

        console.log('🚀 [IA UNIFICADA] Encolando tarea de procesamiento...');

        let imagePath = null;
        if (imageBase64 && imageBase64.startsWith('data:image')) {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            imagePath = path.join(process.cwd(), 'public', `queue_capture_${Date.now()}.jpg`);
            fs.writeFileSync(imagePath, buffer);
        }

        const job = await avatarQueue.add('generateAvatarPipeline', {
            imagePath,
            userId,
            talla,
            patronValName,
            target,
            PORT: process.env.PORT
        });

        res.status(202).json({
            ok: true,
            msg: "Procesamiento iniciado en segundo plano. Recibirás una notificación por WebSockets al finalizar.",
            jobId: job.id,
            status: 'PROCESSING'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error interno del servidor encolando el procesamiento de Avatar.' });
    }
};

const recalculateAvatar = async (req, res) => {
    try {
        const { betas, gender = 'neutral', poseType = 't-pose', poseLShoulder, poseRShoulder, poseLElbow, poseRElbow, poseData } = req.body;
        if (!betas || !Array.isArray(betas)) {

            return res.status(400).json({ ok: false, msg: 'Se requiere un vector de 12 betas.' });
        }

        const jobId = v4();
        const tempDir = path.join(process.cwd(), 'public', 'temp');
        const outputGlb = path.join(tempDir, `recalc_${jobId}.glb`);
        const outputVit = path.join(tempDir, `recalc_${jobId}.vit`);
        
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const scriptPath = path.join(process.cwd(), 'helpers', 'smplx_extractor.py');
        const modelDir = path.join(process.cwd(), 'models', 'smplx');
        
        // Usamos el path completo de Python del entorno que sabemos que funciona
        const pythonPath = "/home/fabio/miniconda3/bin/python3";
        const args = [
            scriptPath,
            "--model_dir", modelDir,
            "--betas", ...betas.map(String),
            "--gender", String(gender),
            "--pose_type", String(poseType),
            "--output_glb", outputGlb,
            "--output_vit", outputVit
        ];

        if (poseLShoulder !== undefined) args.push("--shoulder_l_z", String(poseLShoulder));
        if (poseRShoulder !== undefined) args.push("--shoulder_r_z", String(poseRShoulder));
        if (poseLElbow !== undefined) args.push("--elbow_l_x", String(poseLElbow));
        if (poseRElbow !== undefined) args.push("--elbow_r_x", String(poseRElbow));
        if (poseData !== undefined) {
            args.push("--pose_json", JSON.stringify(poseData));
        }

        console.log(`🤖 [RECALCULATE] Ejecutando: ${pythonPath} ${args.join(' ')}`);

        execFile(pythonPath, args, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ [RECALCULATE] Error: ${error.message}`);
                console.error(`❌ [RECALCULATE] Stderr: ${stderr}`);
                return res.status(500).json({ ok: false, msg: 'Error de motor 3D.', detail: error.message, stderr });
            }
            try {
                // Extraer el bloque JSON de stdout (ignorando advertencias de CUDA u otro texto)
                const jsonMatch = stdout.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No se encontró JSON válido en la salida del script.");
                
                const resultJson = JSON.parse(jsonMatch[0]);
                res.json({ ok: true, meshUrl: `/temp/recalc_${jobId}.glb`, measurements: resultJson, modelType: 'SMPLX_Custom' });
            } catch (e) { 
                console.error("❌ [RECALCULATE] Error parseando JSON:", stdout);
                res.status(500).json({ ok: false, msg: 'Error parseando biométricos.', stdout }); 
            }


        });
    } catch (err) { res.status(500).json({ ok: false, msg: 'Fallo en motor de recalculo.' }); }
};

const uploadModel = async (req, res) => {
    res.status(200).json({ ok: true, msg: "Modelo subido correctamente." });
};

const getClothesCatalog = (req, res) => {
    const catalogoMock = [
        { 
            _id: "saco_neo_2026", 
            titulo: "Saco Neo-Refraction", 
            categoria: "Sacos", 
            talla: "UNISEX",
            prenda3D: "/patterns/Saco.glb",
            img: "/patterns/patron_base_layout_01.svg"
        },
        { 
            _id: "blusa_cyber_01", 
            titulo: "Blusa Cyber-Silk", 
            categoria: "Bluzas", 
            talla: "S",
            img: "/placeholder_hoodie.png" 
        },
        { 
            _id: "pant_tectonic_01", 
            titulo: "Pantalon Tectonic", 
            categoria: "Pantalones", 
            talla: "M",
            img: "/placeholder_pants.png" 
        },
        { 
            _id: "falda_orbital_01", 
            titulo: "Falda Orbital", 
            categoria: "Faldas", 
            talla: "S",
            img: "/patterns/patron_base_layout_01.svg"
        },
        { 
            _id: "hoodie_core_01", 
            titulo: "Oversized Hoodie", 
            categoria: "Sacos", 
            talla: "L",
            img: "/placeholder_hoodie.png" 
        }
    ];
    res.json({ ok: true, data: catalogoMock });
};



const getAvatarById = async (req, res) => {
    try {
        const { id } = req.params;
        const avatar = await Avatar.findById(id);
        if (!avatar) return res.status(404).json({ ok: false, msg: 'Avatar no encontrado' });
        res.json({ ok: true, avatar });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error interno obteniendo avatar' });
    }
};

const tryOnClothes = async (req, res) => {
    const { avatarId, prendaId } = req.body;
    console.log(`👕 Solicitud de Try-On para el avatar [${avatarId}] usando prenda [${prendaId}]`);
    setTimeout(() => {
        res.json({
            ok: true,
            msg: "Simulación de ropa sobre malla completada",
            resultConfig: { clothScale: 1.05, deformMatrix: "..." }
        });
    }, 2500);
};

const getPredefinedAvatars = (req, res) => {
    const predefined = [
        { 
            id: 'std_athletic', 
            name: 'Atlético', 
            description: 'Perfil muscular hombros anchos',
            meshUrl: '/avatars/standard_male.glb', 
            betas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            measurements: { height: 180, chest: 104, waist: 82, hips: 98 } 
        },
        { 
            id: 'std_slim', 
            name: 'Esbelto', 
            description: 'Perfil delgado y espigado',
            meshUrl: '/avatars/standard_female.glb', 
            betas: [0.5, -1, 0, 0, 0, 0, 0, 0, 0, 0],
            measurements: { height: 170, chest: 88, waist: 64, hips: 92 } 
        },
        { 
            id: 'std_curvy', 
            name: 'Curvilíneo', 
            description: 'Perfil con curvas pronunciadas',
            meshUrl: '/avatars/standard_curvy.glb', 
            betas: [2.0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0],
            measurements: { height: 165, chest: 98, waist: 72, hips: 105 } 
        }
    ];
    res.json({ ok: true, data: predefined });
};

module.exports = {
    generateAvatar,
    recalculateAvatar,
    uploadModel,
    getClothesCatalog,
    getPredefinedAvatars,
    getAvatarById,
    tryOnClothes
};
