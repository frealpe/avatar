const { Router } = require('express');
const Avatar = require('../models/AvatarModel');
const AnnyPipeline = require('../services/annyPipeline');

const router = Router();

const catalogoMock = [
    { id: 1, name: "Oversized Hoodie", category: "Core Collection", img: "/placeholder_hoodie.png" },
    { id: 2, name: "Tapered Denim", category: "Essential Fit", img: "/placeholder_pants.png" },
    { id: 3, name: "Puffer Jacket", category: "Thermal Tech", img: "/placeholder_jacket.png" }
];

/**
 * @route POST /api/avatar/generate
 * Recibe una imagen.
 * Pasa la imagen al pipeline Anny IA y guarda los shape params en Mongo.
 */
router.post('/generate', async (req, res) => {
    try {
        const { imageBase64, userId = 'mobile_user_01' } = req.body;
        const io = req.app.get('io');

        // Procesamos con el pipeline real (que ahora emite sockets)
        const params = await AnnyPipeline.processImageToAnnyParams(imageBase64 || 'default_stream', io);

        // Instanciar y guardar en MongoDB
        const nuevoAvatar = new Avatar({
            userId,
            modelType: params.modelType || 'Anny_01',
            measurements: params.measurements,
            shapeParams: params.shapeParams,
            poseParams: params.poseParams,
            status: 'READY'
        });

        await nuevoAvatar.save();

        res.status(201).json({
            ok: true,
            msg: "Avatar generado con el modelo Anny y sincronizado vía Sockets.",
            avatar: nuevoAvatar
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error interno del servidor generando el Avatar.' });
    }
});

/**
 * @route POST /api/avatar/upload
 * Sube un archivo de modelo 3D.
 */
router.post('/upload', async (req, res) => {
    // Implementación mock para almacenamiento de modelos
    res.status(200).json({
        ok: true,
        msg: "Modelo subido correctamente."
    });
});

/**
 * @route GET /api/avatar/clothes
 * Devuelve catálogo disponible para probar.
 */
router.get('/clothes', (req, res) => {
    res.json({ ok: true, data: catalogoMock });
});

// Alias for backwards compatibility
router.get('/catalog', (req, res) => {
    res.json({ ok: true, data: catalogoMock });
});

/**
 * @route GET /api/avatar/:id
 * Devuelve un avatar por ID.
 */
router.get('/:id', async (req, res) => {
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
});

/**
 * @route POST /api/avatar/try-on
 * Interpola las mallas (Virtual Try On) con Anny.
 */
router.post('/try-on', async (req, res) => {
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
});

// Alias for backwards compatibility
router.post('/tryon', async (req, res) => {
    const { avatarId, prendaId } = req.body;

    console.log(`👕 Solicitud de Try-On para el avatar [${avatarId}] usando prenda [${prendaId}]`);

    setTimeout(() => {
        res.json({
            ok: true,
            msg: "Simulación de ropa sobre malla completada",
            resultConfig: {
                clothScale: 1.05,
                deformMatrix: "..."
            }
        });
    }, 2500);
});

module.exports = router;
