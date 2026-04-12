const { Router } = require('express');
const { savePose, getPosesByAvatar, deletePose, setDefaultPose } = require('../controllers/pose');
const { validarJWT } = require('../middlewares/validar-jwt');

const router = Router();

// Save or Update a Pose
router.post('/', [validarJWT], savePose);

// Get all poses for an avatar
router.get('/avatar/:avatarId', [validarJWT], getPosesByAvatar);

// Delete a pose
router.delete('/:id', [validarJWT], deletePose);

// Set a pose as default
router.patch('/default/:id', [validarJWT], setDefaultPose);

module.exports = router;
