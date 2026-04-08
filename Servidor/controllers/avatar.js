const Avatar = require('../models/AvatarModel');
const AnnyPipeline = require('../services/annyPipeline');
const { procesarPrenda } = require('../services/vision_parser');
const { generarArchivoVIT, generarSVG } = require('../services/seamly_engine');
const { generarPrenda3D } = require('../services/blender_engine');
const path = require('path');
const fs = require('fs');

const generateAvatar = async (req, res) => {
    try {
        const { imageBase64, userId = 'mobile_user_01', talla = 'M', patronValName = 'patron_base.val' } = req.body;
        const io = req.app.get('io');

        console.log('🚀 [IA UNIFICADA] Iniciando procesamiento paralelo (3D Trellis + 2D LLaVA)...');

        // 1. Promesa A: Procesamiento de Avatar 3D (Pipeline Trellis Nativo)
        const meshPromise = AnnyPipeline.processImageToAnnyParams(imageBase64 || 'default_stream', io);

        // 2. Promesa B: Procesamiento 2D de Patrones de Costura (Ollama Local + Seamly)
        const patternPromise = (async () => {
             const inputImage = imageBase64;
             if (!inputImage || typeof inputImage !== 'string' || !inputImage.startsWith('data:image')) {
                 console.warn('Imagen vacía o no base64, saltando parser local');
                 return { url: null, params: {} };
             }

             // Extraer dict
             const resultIa = await procesarPrenda(inputImage, talla);
             const publicPatterns = path.join(process.cwd(), 'public', 'patterns');
             if (!fs.existsSync(publicPatterns)) fs.mkdirSync(publicPatterns, { recursive: true });

             const vitPath = path.join(publicPatterns, `medidas_${Date.now()}.vit`);
             const archivoVit = generarArchivoVIT(resultIa.parametros, vitPath);

             const valPath = path.join(publicPatterns, patronValName);
             if (fs.existsSync(valPath)) {
                 await generarSVG(archivoVit, valPath, publicPatterns);
                 const svgURL = `http://localhost:${process.env.PORT || 8080}/patterns/${patronValName.replace('.val', '.svg')}`;
                 const absoluteSvgPath = path.join(publicPatterns, patronValName.replace('.val', '.svg'));
                 return { url: svgURL, absoluteSvgPath, params: resultIa.parametros };
             } else {
                 console.warn(`[SEAMLY] No se halló el patrón .val maestro en ${valPath}`);
                 return { url: null, absoluteSvgPath: null, params: resultIa.parametros };
             }
        })();

        // 3. Esperar a que Ambas IAs regresen (Si una falla, la otra de igual forma sobrevive)
        const [meshResult, patternResult] = await Promise.allSettled([meshPromise, patternPromise]);

        let params = {};
        let absoluteAvatarPath = null;
        if (meshResult.status === 'fulfilled') {
            params = meshResult.value;
            // Assuming meshUrl might be a relative or full URL. If local, we need the local path.
            // For now, let's assume it points to public/avatars or similar.
            if (params.meshUrl) {
                const urlObj = new URL(params.meshUrl, `http://localhost:${process.env.PORT || 8080}`);
                absoluteAvatarPath = path.join(process.cwd(), 'public', urlObj.pathname);
            }
        } else {
            console.error('❌ Error en Generación Trellis 3D:', meshResult.reason);
        }

        let patternUrl = null;
        let garmentParams = {};
        let absoluteSvgPath = null;
        if (patternResult.status === 'fulfilled') {
            patternUrl = patternResult.value.url;
            garmentParams = patternResult.value.params;
            absoluteSvgPath = patternResult.value.absoluteSvgPath;
        } else {
            console.error('❌ Error en Pipeline Local Ollama/Seamly:', patternResult.reason);
        }

        // 4. Promesa C: Generación de Prenda 3D en Blender
        let blenderPromise = Promise.resolve({ glbPrendaUrl: null });
        if (absoluteAvatarPath && absoluteSvgPath && fs.existsSync(absoluteAvatarPath) && fs.existsSync(absoluteSvgPath)) {
             const prendaOutputName = `prenda_${Date.now()}.glb`;
             blenderPromise = generarPrenda3D({
                 avatarPath: absoluteAvatarPath,
                 svgPath: absoluteSvgPath,
                 outputName: prendaOutputName
             });
        } else {
             console.warn('[BLENDER ENGINE] Saltando simulación 3D: avatar o svg no disponibles localmente.');
        }

        const [blenderResult] = await Promise.allSettled([blenderPromise]);

        let prenda3DUrl = null;
        if (blenderResult.status === 'fulfilled') {
             // For consistency with SVG URL, make it full URL or relative. The frontend expects what's in meshUrl.
             // Usually it's better to keep it absolute if SVG is absolute, or relative. Let's make it full URL:
             if (blenderResult.value && blenderResult.value.glbPrendaUrl) {
                 prenda3DUrl = `http://localhost:${process.env.PORT || 8080}${blenderResult.value.glbPrendaUrl}`;
             }
        } else {
             console.error('❌ Error en Blender Engine 3D:', blenderResult.reason);
        }

        // Instanciar y guardar la unificación en MongoDB
        const nuevoAvatar = new Avatar({
            userId,
            modelType: params.modelType || 'Unified_AI_01',
            meshUrl: params.meshUrl || null,
            measurements: params.measurements || {},
            shapeParams: params.shapeParams || [],
            poseParams: params.poseParams || [],
            patternUrl: patternUrl,
            garmentParams: garmentParams,
            prenda3D: prenda3DUrl,
            status: 'READY'
        });

        await nuevoAvatar.save();

        res.status(201).json({
            ok: true,
            msg: "Mega-Pipeline de IA desplegado. Modelos unificados.",
            avatar: nuevoAvatar
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error interno del servidor generando el Avatar.' });
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
