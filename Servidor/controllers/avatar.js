const Avatar = require('../models/AvatarModel');
const Prenda = require('../models/PrendaModel');
const { avatarQueue } = require('../helpers/queue');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const v4 = require('uuid').v4;
const { Types } = require('mongoose');
const { calcularTalla } = require('../helpers/sizing');

const normalizeAvatarPayload = (payload = {}) => {
    const inputMeasurements = payload.measurements || {};
    const betas = Array.isArray(payload.betas)
        ? payload.betas
        : Array.isArray(payload.shapeParams)
            ? payload.shapeParams
            : [];

    const data = {
        userId: payload.userId || null,
        modelType: payload.modelType || payload.name || 'SAM3D_Standard',
        gender: payload.gender || 'neutral',
        meshUrl: payload.meshUrl || null,
        measurements: {
            height: Number(inputMeasurements.height) || 170,
            weight: Number(inputMeasurements.weight) || 70,
            chest: Number(inputMeasurements.chest) || 95,
            waist: Number(inputMeasurements.waist) || 80,
            hips: Number(inputMeasurements.hips) || 95,
            shoulders: Number(inputMeasurements.shoulders) || 45,
            inseam: Number(inputMeasurements.inseam) || 75
        },
        shapeParams: betas,
        poseParams: Array.isArray(payload.poseParams) ? payload.poseParams : [],
        patternUrl: payload.patternUrl || null,
        garmentParams: payload.garmentParams || {},
        prenda3D: payload.prenda3D || null,
        prendaTalla: payload.prendaTalla || 'M',
        selectedGarments: Array.isArray(payload.selectedGarments) ? payload.selectedGarments : [],
        status: payload.status || 'READY'
    };

    const { talla_letra } = calcularTalla(
        data.gender,
        data.measurements.chest,
        data.measurements.waist,
        data.measurements.hips
    );
    data.tallaSugerida = talla_letra;

    return data;
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
                    const jsonMatch = stdout.match(/\{.*\}/s);
                    if (jsonMatch) pythonOutput = JSON.parse(jsonMatch[0].trim());
                }

                if (!pythonOutput) throw new Error("No valid JSON found in output");
                
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

const getClothesCatalog = async (req, res) => {
    try {
        let prendas = await Prenda.find().sort({ createdAt: -1 });

        // Seed if empty
        if (prendas.length === 0) {
            const seed = [
                { 
                    name: "Saco Neo-Refraction", 
                    categoria: "SACOS", 
                    marca: "ANNY",
                    talla: "M",
                    prenda3D: "/clothes/sacos/Saco.glb",
                    image: "/clothes/sacos/Saco_preview.jpg",
                    price: 120,
                    normal: { x: 0, y: 0, z: 1 },
                    measurements: { ancho_cm: 52, largo_cm: 68, profundidad_cm: 22, pecho_cm: 104, cintura_cm: 88, brazo_cm: 64 }
                },
                { 
                    name: "Blusa Silk Flow", 
                    categoria: "BLUZAS", 
                    marca: "ETHEREAL",
                    talla: "S",
                    prenda3D: "/clothes/bluzas/Blusa_Silk.glb",
                    image: "/clothes/bluzas/Blusa_Silk_preview.jpg",
                    price: 65,
                    normal: { x: 0, y: 0, z: 1 },
                    measurements: { ancho_cm: 45, largo_cm: 62, profundidad_cm: 18, pecho_cm: 92, cintura_cm: 74, brazo_cm: 58 }
                },
                { 
                    name: "Pantalon Cargo T-800", 
                    categoria: "PANTALONES", 
                    marca: "INDUSTRIAL-WEAR",
                    talla: "M",
                    prenda3D: "/clothes/pantalones/Pantalon_Cargo.glb",
                    image: "/clothes/pantalones/Pantalon_Cargo_preview.jpg",
                    price: 95,
                    normal: { x: 0, y: 0, z: 1 },
                    measurements: { ancho_cm: 42, largo_cm: 104, profundidad_cm: 20, pecho_cm: 0, cintura_cm: 82, brazo_cm: 0 }
                }
            ];
            await Prenda.insertMany(seed);
            prendas = await Prenda.find().sort({ createdAt: -1 });
        }

        res.json({ ok: true, data: prendas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error obteniendo catálogo' });
    }
};

const approveGarment = async (req, res) => {
    try {
        const { prendaId, meshUrl } = req.body;

        if (!prendaId || !meshUrl) {
            return res.status(400).json({ ok: false, msg: 'Se requiere prendaId y meshUrl' });
        }

        // Si es una prenda mock id, no podemos actualizarla en DB real a menos que la creemos
        // Pero ahora que tenemos DB real, buscaremos por ID
        const prenda = await Prenda.findById(prendaId);
        if (!prenda) return res.status(404).json({ ok: false, msg: 'Prenda no encontrada' });

        // Actualizamos la prenda con el modelo ajustado
        prenda.prenda3D = meshUrl;
        prenda.isFitted = true;
        await prenda.save();

        res.json({
            ok: true,
            msg: "Prenda aprobada y guardada en la colección",
            prenda
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al aprobar prenda' });
    }
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

const getAvatarByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const avatar = await Avatar.findOne({ userId }).sort({ createdAt: -1 });
        if (!avatar) return res.status(404).json({ ok: false, msg: 'Avatar no encontrado para este usuario' });
        res.json({ ok: true, avatar });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error interno obteniendo avatar por usuario' });
    }
};

const tryOnClothes = async (req, res) => {
    try {
        const { avatarUrl, garmentUrl } = req.body;

        if (!avatarUrl || !garmentUrl) {
            return res.status(400).json({ ok: false, msg: 'Se requiere avatarUrl y garmentUrl' });
        }

        const jobId = v4();
        const tempDir = path.join(process.cwd(), 'public', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const outputGlb = path.join(tempDir, `dress_${jobId}.glb`);
        
        // Resolve absolute paths
        const resolvePath = (url) => {
            if (url.startsWith('http')) {
                // Remove base URL if present
                const parts = url.split('/');
                const filename = parts.slice(3).join('/'); // Skip http://host:port/
                return path.join(process.cwd(), 'public', filename);
            }
            return path.join(process.cwd(), 'public', url.startsWith('/') ? url.slice(1) : url);
        };

        const absAvatarPath = resolvePath(avatarUrl);
        const absGarmentPath = resolvePath(garmentUrl);

        if (!fs.existsSync(absAvatarPath)) return res.status(404).json({ ok: false, msg: `Avatar no encontrado en: ${absAvatarPath}` });
        if (!fs.existsSync(absGarmentPath)) return res.status(404).json({ ok: false, msg: `Prenda no encontrada en: ${absGarmentPath}` });

        const blenderPath = "blender";
        const scriptPath = path.join(process.cwd(), 'blender', 'auto_dress.py');

        const args = [
            '-b',
            '-P', scriptPath,
            '--',
            absAvatarPath,
            absGarmentPath,
            outputGlb
        ];

        const io = req.app.get('io');

        const { spawn } = require('child_process');
        const child = spawn(blenderPath, args);

        child.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[BLENDER] ${output.trim()}`);

            // Regex for matching progress (handles v1 and v2 pipeline formats)
            const match = output.match(/Frame (\d+)\/(\d+)/) || output.match(/Simulation: (\d+)\/(\d+)/) || output.match(/\[S6\].*Frame (\d+)\/(\d+)/);
            if (match && io) {
                const currentFrame = parseInt(match[1]);
                const totalFrames = parseInt(match[2]);
                const progress = Math.round((currentFrame / totalFrames) * 100);
                
                io.emit('dress:progress', {
                    jobId,
                    progress,
                    frame: currentFrame,
                    total: totalFrames
                });
            }
        });

        child.stderr.on('data', (data) => {
            console.error(`[BLENDER-ERR] ${data.toString()}`);
        });

        child.on('error', (err) => {
            console.error(`❌ [TRY-ON] Fallo al iniciar proceso: ${err.message}`);
            if (!res.headersSent) {
                return res.status(500).json({ ok: false, msg: 'No se pudo iniciar el motor de vestimenta.', detail: err.message });
            }
        });

        // Immediate Response
        res.json({ ok: true, jobId, msg: 'Simulación iniciada en segundo plano' });

        child.on('close', (code) => {
            console.log(`[BLENDER] Proceso finalizado con código: ${code}`);
            if (code === 0) {
                if (io) {
                    io.emit('dress:completed', { 
                        jobId, 
                        meshUrl: `/temp/dress_${jobId}.glb`, 
                        msg: 'Simulación completada con éxito' 
                    });
                }
            } else {
                if (io) {
                    io.emit('dress:error', { 
                        jobId, 
                        msg: 'Error en el motor de físicas de Blender' 
                    });
                }
            }
        });

    } catch (err) {
        console.error('❌ [TRY-ON] Error crítico:', err);
        if (!res.headersSent) {
            return res.status(500).json({ ok: false, msg: 'Fallo interno en simulación de vestimenta.' });
        }
    }
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
            if (avatarData.userId === 'guest_user') avatarData.userId = null; 
            
            avatar = await Avatar.create(avatarData);
        }

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
            gender: 'male',
            description: 'Perfil muscular hombros anchos',
            meshUrl: '/avatars/standard_male.glb', 
            betas: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            measurements: { height: 180, chest: 104, waist: 82, hips: 98 },
            normal: { x: 0, y: 0, z: 1 }
        },
        { 
            id: 'std_slim', 
            name: 'mujer', 
            gender: 'female',
            description: 'Perfil delgado y espigado',
            meshUrl: '/avatars/standard_female.glb', 
            betas: [0.5, -1, 0, 0, 0, 0, 0, 0, 0, 0],
            measurements: { height: 170, chest: 88, waist: 64, hips: 92 },
            normal: { x: 0, y: 0, z: 1 }
        },
        { 
            id: 'std_curvy', 
            name: 'niño', 
            gender: 'neutral',
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

const analyzeGarmentGlb = async (req, res) => {
    try {
        const { glbBase64, userId = 'guest_user' } = req.body;

        if (!glbBase64) {
            return res.status(400).json({ ok: false, msg: 'Falta el archivo GLB en formato base64' });
        }

        const jobId = v4();
        const tempDir = path.join(process.cwd(), 'public', 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const inputGlb = path.join(tempDir, `analyze_${jobId}.glb`);
        const base64Data = glbBase64.replace(/^data:application\/\w+;base64,/, "").replace(/^data:model\/\w+;base64,/, "");
        fs.writeFileSync(inputGlb, Buffer.from(base64Data, 'base64'));

        const pythonPath = "/home/fabio/miniconda3/bin/python3";
        const scriptPath = path.join(process.cwd(), 'helpers', 'garment_analyzer.py');

        execFile(pythonPath, [scriptPath, '--input', inputGlb], (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ [ANALYZE-GARMENT] Error: ${error.message}`);
                return res.status(500).json({ ok: false, msg: 'Error analizando prenda GLB' });
            }

            try {
                const result = JSON.parse(stdout.trim());
                if (!result.ok) throw new Error(result.msg);

                const meshUrl = `/temp/analyze_${jobId}.glb`;

                res.json({
                    ok: true,
                    meshUrl,
                    garmentParams: result.measurements,
                    status: 'READY'
                });
            } catch (err) {
                console.error(`❌ [ANALYZE-GARMENT] Parse error: ${stdout}`);
                res.status(500).json({ ok: false, msg: 'Error procesando resultado del análisis' });
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error interno analizando prenda' });
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
    getAvatarByUserId,
    tryOnClothes,
    updateAvatar,
    analyzeGarmentGlb,
    approveGarment
};
