const { Router } = require('express');
const { 
    generateAvatar, 
    uploadModel, 
    getClothesCatalog, 
    getPredefinedAvatars,
    ensureAvatar,
    getAvatarById, 
    getAvatarByUserId,
    tryOnClothes,
    recalculateAvatar,
    updateAvatar,
    analyzeGarmentGlb,
    approveGarment
} = require('../controllers/avatar');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

router.get('/predefined', getPredefinedAvatars);
router.get('/user/:userId', [validarJWT], getAvatarByUserId);

/**
 * @route POST /api/avatar/generate
 * Recibe una imagen.
 * Pasa la imagen al pipeline Anny IA y guarda los shape params en Mongo.
 */
router.post('/generate', [validarJWT], generateAvatar);

/**
 * @route POST /api/avatar/recalculate
 * Recalcula los parámetros del avatar.
 */
router.post('/recalculate', [validarJWT], recalculateAvatar);
router.post('/ensure', [validarJWT], ensureAvatar);

/**
 * @route POST /api/avatar/upload
 * Sube un archivo de modelo 3D.
 */
router.post('/upload', [validarJWT], uploadModel);

/**
 * @route GET /api/avatar/clothes
 * Devuelve catálogo disponible para probar.
 */
router.get('/clothes', getClothesCatalog);
router.get('/catalog', getClothesCatalog);

/**
 * @route GET /api/avatar/:id
 * Devuelve un avatar por ID.
 */
router.get('/:id', [validarJWT], getAvatarById);

/**
 * @route POST /api/avatar/try-on
 * Interpola las mallas (Virtual Try On) con Anny.
 */
router.post('/try-on', [validarJWT], tryOnClothes);
router.post('/tryon', [validarJWT], tryOnClothes);

router.post('/analyze-garment', [validarJWT], analyzeGarmentGlb);
router.post('/approve-garment', [validarJWT], approveGarment);

/**
 * @route PATCH /api/avatar/:id
 * Actualiza cualquier campo del avatar.
 */
router.patch('/:id', [validarJWT], updateAvatar);

module.exports = router;
