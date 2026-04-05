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
 * Recibe una imagen (idealmente en multer object form data o base64).
 * Pasa la imagen al pipeline Anny IA y guarda los shape params en Mongo.
 */
router.post('/generate', async (req, res) => {
    try {
        const { imageBase64, userId = 'mobile_user_01' } = req.body;

        // Simulamos la obtención de parámetros corporales usando la "cámara"
        const params = await AnnyPipeline.processImageToAnnyParams(imageBase64 || 'default_stream');

        // Instanciar y guardar en MondoDB
        const nuevoAvatar = new Avatar({
            userId,
            modelType: 'Anny_01',
            measurements: params.measurements,
            shapeParams: params.shapeParams,
            poseParams: params.poseParams,
            status: 'READY'
        });

        await nuevoAvatar.save();

        res.status(201).json({
            ok: true,
            msg: "Avatar generado con el modelo Anny y guardado.",
            avatar: nuevoAvatar
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error interno del servidor generando el Avatar.' });
    }
});

/**
 * @route GET /api/avatar/catalog
 * Devuelve catálogo disponible para probar.
 */
router.get('/catalog', (req, res) => {
    res.json({ ok: true, data: catalogoMock });
});

/**
 * @route POST /api/avatar/tryon
 * Interpola las mallas (Virtual Try On) con Anny.
 */
router.post('/tryon', async (req, res) => {
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

module.exports = router;
