const Avatar = require('../models/AvatarModel');
const { avatarQueue } = require('../helpers/queue');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const v4 = require('uuid').v4;
const { Types } = require('mongoose');

const normalizeAvatarPayload = (payload = {}) => {
    const inputMeasurements = payload.measurements || {};
    const betas = Array.isArray(payload.betas)
        ? payload.betas
        : Array.isArray(payload.shapeParams)
            ? payload.shapeParams
            : [];

    return {
        userId: payload.userId || null,
    modelType: payload.modelType || payload.name || 'SAM3D_Standard',
        meshUrl: payload.meshUrl || null,
        measurements: {
            height: Number(inputMeasurements.height) || 170,
            weight: Number(inputMeasurements.weight) || 70,
            chest: inputMeasurements.chest ?? null,
            waist: inputMeasurements.waist ?? null,
            hips: inputMeasurements.hips ?? null,
            shoulders: inputMeasurements.shoulders ?? null,
            inseam: inputMeasurements.inseam ?? null
        },
        shapeParams: betas,
        poseParams: Array.isArray(payload.poseParams) ? payload.poseParams : [],
        patternUrl: payload.patternUrl || null,
        garmentParams: payload.garmentParams || {},
        prenda3D: payload.prenda3D || null,
        selectedGarments: Array.isArray(payload.selectedGarments) ? payload.selectedGarments : [],
        status: payload.status || 'READY'
    };
};

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

const AnnyPipeline = require('../services/annyPipeline');

const recalculateAvatar = async (req, res) => {
    try {
        const { betas, gender = 'neutral', poseData } = req.body;
        let betasToUse = Array.isArray(betas) && betas.length > 0 
            ? betas 
            : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        const jobId = v4();
        const tempDir = path.join(process.cwd(), 'public', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const outputGlb = path.join(tempDir, `recalc_${jobId}.glb`);
        const outputVit = path.join(tempDir, `recalc_${jobId}.vit`);

        const pythonPath = "/home/fabio/miniconda3/bin/python3";
        const scriptPath = path.join(process.cwd(), 'helpers', 'smplx_extractor.py');

        const args = [
            scriptPath,
            '--betas', ...betasToUse.map(String),
            '--gender', gender,
            '--output_glb', outputGlb,
            '--output_vit', outputVit
        ];

        if (poseData) {
            args.push('--pose_data');
            args.push(JSON.stringify(poseData));
        }

        console.log(`🤖 [RECALCULATE] Ejecutando: ${pythonPath} ${args.join(' ')}`);

        execFile(pythonPath, args, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ [RECALCULATE] Error: ${error.message}`);
                console.error(`STDERR: ${stderr}`);
                return res.status(500).json({ ok: false, msg: 'Error ejecutando motor de recalculo.', detail: error.message });
            }

            try {
                // El script puede imprimir logs de inicialización de Warp/Anny.
                // Buscamos la línea que empieza por '{' y termina por '}'
                const lines = stdout.split('\n');
                let pythonOutput = null;
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                        try {
                            pythonOutput = JSON.parse(trimmed);
                            break;
                        } catch (e) { continue; }
                    }
                }

                if (!pythonOutput) {
                    // Fallback al regex por si el JSON está en varias líneas
                    const jsonMatch = stdout.match(/\{.*\}/s);
                    if (jsonMatch) pythonOutput = JSON.parse(jsonMatch[0].trim());
                }

                if (!pythonOutput) throw new Error("No valid JSON found in output");
                
                // Url para el frontend
                const meshUrl = `/temp/recalc_${jobId}.glb`;

                return res.json({
                    ok: true,
                    meshUrl,
                    measurements: pythonOutput,
                    betas: betas
                });
            } catch (parseErr) {
                console.error(`❌ [RECALCULATE] Error parseando salida: ${stdout}`);
                return res.status(500).json({ ok: false, msg: 'Error procesando resultado del motor.' });
            }
        });

    } catch (err) {
        console.error('❌ [RECALCULATE] Error crítico:', err);
        return res.status(500).json({ ok: false, msg: 'Fallo interno en recalculo.' });
    }
};

const uploadModel = async (req, res) => {
    res.status(200).json({ ok: true, msg: "Modelo subido correctamente." });
};

const getClothesCatalog = (req, res) => {
    const catalogoMock = [
        { 
            _id: "saco_neo_2026", 
            name: "Saco Neo-Refraction", 
            categoria: "SACOS", 
            marca: "MODAVATAR",
            talla: "UNISEX",
            prenda3D: "/clothes/sacos/Saco.glb",
            image: "/clothes/sacos/Saco_preview.jpg",
            price: 150,
            normal: { x: 0, y: 0, z: 1 }
        },
        { 
            _id: "blusa_silk_01", 
            name: "Bluza Silk-Cyber", 
            categoria: "BLUZAS", 
            marca: "ETHEREAL",
            talla: "S",
            prenda3D: "/clothes/bluzas/Blusa_Silk.glb",
            image: "/clothes/bluzas/Blusa_Silk_preview.jpg",
            price: 65,
            normal: { x: 0, y: 0, z: 1 }
        },
        { 
            _id: "pant_cargo_01", 
            name: "Pantalon Cargo T-800", 
            categoria: "PANTALONES", 
            marca: "INDUSTRIAL-WEAR",
            talla: "M",
            prenda3D: "/clothes/pantalones/Pantalon_Cargo.glb",
            image: "/clothes/pantalones/Pantalon_Cargo_preview.jpg",
            price: 95,
            normal: { x: 0, y: 0, z: 1 }
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

const Usuario = require('../models/UsuarioModel');

const ensureAvatar = async (req, res) => {
    try {
        const incomingAvatar = req.body || {};
        let avatar;

        if (incomingAvatar._id && Types.ObjectId.isValid(incomingAvatar._id)) {
            const existingAvatar = await Avatar.findById(incomingAvatar._id);
            if (existingAvatar) {
                const updatedData = normalizeAvatarPayload({ ...existingAvatar.toObject(), ...incomingAvatar });
                avatar = await Avatar.findByIdAndUpdate(existingAvatar._id, updatedData, {
                    new: true,
                    runValidators: true
                });
            }
        }

        if (!avatar) {
            const avatarData = normalizeAvatarPayload(incomingAvatar);
            // Ensure userId is valid ObjectId if it's present
            if (avatarData.userId === 'guest_user') avatarData.userId = null; 
            
            avatar = await Avatar.create(avatarData);
        }

        // Vincular al usuario si userId es valido
        if (avatar.userId && Types.ObjectId.isValid(avatar.userId)) {
            await Usuario.findByIdAndUpdate(avatar.userId, { avatar: avatar._id });
        }

        res.status(201).json({
            ok: true,
            avatar: {
                ...avatar.toObject(),
                betas: incomingAvatar.betas || avatar.shapeParams || []
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error asegurando avatar en base de datos.' });
    }
};

const getPredefinedAvatars = (req, res) => {
    const predefined = [
        { 
            id: 'std_athletic', 
            name: 'hombre', 
            description: 'Perfil muscular hombros anchos',
            meshUrl: '/avatars/standard_male.glb', 
            betas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            measurements: { height: 180, chest: 104, waist: 82, hips: 98 },
            normal: { x: 0, y: 0, z: 1 }
        },
        { 
            id: 'std_slim', 
            name: 'mujer', 
            description: 'Perfil delgado y espigado',
            meshUrl: '/avatars/standard_female.glb', 
            betas: [0.5, -1, 0, 0, 0, 0, 0, 0, 0, 0],
            measurements: { height: 170, chest: 88, waist: 64, hips: 92 },
            normal: { x: 0, y: 0, z: 1 }
        },
        { 
            id: 'std_curvy', 
            name: 'niño', 
            description: 'Perfil con curvas pronunciadas',
            meshUrl: '/avatars/standard_curvy.glb', 
            betas: [2.0, 0.5, 0, 0, 0, 0, 0, 0, 0, 0],
            measurements: { height: 165, chest: 98, waist: 72, hips: 105 },
            normal: { x: 0, y: 0, z: 1 }
        }
    ];
    res.json({ ok: true, data: predefined });
};

const updateAvatar = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const avatar = await Avatar.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!avatar) {
            return res.status(404).json({ ok: false, msg: 'Avatar no encontrado' });
        }

        res.json({ ok: true, avatar });
    } catch (error) {
        console.error('Error updating avatar:', error);
        res.status(500).json({ ok: false, msg: 'Error interno actualizando avatar' });
    }
};

module.exports = {
    generateAvatar,
    recalculateAvatar,
    uploadModel,
    getClothesCatalog,
    getPredefinedAvatars,
    ensureAvatar,
    getAvatarById,
    tryOnClothes,
    updateAvatar
};
