const { Router } = require('express');
const { 
    generateAvatar, 
    uploadModel, 
    getClothesCatalog, 
    getPredefinedAvatars,
    ensureAvatar,
    getAvatarById, 
    tryOnClothes,
    recalculateAvatar
} = require('../controllers/avatar');

const router = Router();

router.get('/predefined', getPredefinedAvatars);

/**
 * @route POST /api/avatar/generate
 * Recibe una imagen.
 * Pasa la imagen al pipeline Anny IA y guarda los shape params en Mongo.
 */
router.post('/generate', generateAvatar);

/**
 * @route POST /api/avatar/recalculate
 * Recalcula los parámetros del avatar.
 */
router.post('/recalculate', recalculateAvatar);
router.post('/ensure', ensureAvatar);

/**
 * @route POST /api/avatar/upload
 * Sube un archivo de modelo 3D.
 */
router.post('/upload', uploadModel);

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
router.get('/:id', getAvatarById);

/**
 * @route POST /api/avatar/try-on
 * Interpola las mallas (Virtual Try On) con Anny.
 */
router.post('/try-on', tryOnClothes);
router.post('/tryon', tryOnClothes);

module.exports = router;
