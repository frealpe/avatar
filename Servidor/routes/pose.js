const { Router } = require('express');
const { savePose, getPosesByAvatar, deletePose } = require('../controllers/pose');

const router = Router();

// Save or Update a Pose
router.post('/', savePose);

// Get all poses for an avatar
router.get('/avatar/:avatarId', getPosesByAvatar);

// Delete a pose
router.delete('/:id', deletePose);

module.exports = router;
