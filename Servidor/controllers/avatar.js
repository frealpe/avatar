const Avatar = require('../models/AvatarModel');
const { avatarQueue } = require('../helpers/queue');
const path = require('path');
const fs = require('fs');

const generateAvatar = async (req, res) => {
    try {
        const { imageBase64, userId = 'mobile_user_01', talla = 'M', patronValName = 'patron_base.val' } = req.body;

        console.log('🚀 [IA UNIFICADA] Encolando tarea de procesamiento...');

        // Save image to temporary file to avoid large payloads in Redis
        let imagePath = null;
        if (imageBase64 && imageBase64.startsWith('data:image')) {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            imagePath = path.join(process.cwd(), 'public', `queue_capture_${Date.now()}.jpg`);
            fs.writeFileSync(imagePath, buffer);
        }

        // Añadir trabajo a la cola de BullMQ en vez de bloquear el hilo
        const job = await avatarQueue.add('generateAvatarPipeline', {
            imagePath, // use path instead of base64 string
            userId,
            talla,
            patronValName,
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

const uploadModel = async (req, res) => {
    // Implementación mock para almacenamiento de modelos
    res.status(200).json({
        ok: true,
        msg: "Modelo subido correctamente."
    });
};

const getClothesCatalog = (req, res) => {
    const catalogoMock = [
        { id: 1, name: "Oversized Hoodie", category: "Core Collection", img: "/placeholder_hoodie.png" },
        { id: 2, name: "Tapered Denim", category: "Essential Fit", img: "/placeholder_pants.png" },
        { id: 3, name: "Puffer Jacket", category: "Thermal Tech", img: "/placeholder_jacket.png" }
    ];
    res.json({ ok: true, data: catalogoMock });
};

const getAvatarById = async (req, res) => {
    try {
        const { id } = req.params;

        const avatar = await Avatar.findById(id);
        if (!avatar) {
            return res.status(404).json({ ok: false, msg: 'Avatar no encontrado' });
        }
        res.json({ ok: true, avatar });
    } catch (error) {
        res.status(500).json({ ok: false, msg: 'Error interno obteniendo avatar' });
    }
};

const tryOnClothes = async (req, res) => {
    const { avatarId, prendaId } = req.body;
    
    // Aquí el backend podría despachar un Job pesado para Cloth Simulation
    console.log(`👕 Solicitud de Try-On para el avatar [${avatarId}] usando prenda [${prendaId}]`);

    setTimeout(() => {
        res.json({
            ok: true,
            msg: "Simulación de ropa sobre malla completada",
            resultConfig: {
                clothScale: 1.05,
                deformMatrix: "..." // Matrices generadas por la IA para ThreeJS
            }
        });
    }, 2500);
};

module.exports = {
    generateAvatar,
    uploadModel,
    getClothesCatalog,
    getAvatarById,
    tryOnClothes
};
