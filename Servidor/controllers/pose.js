const Pose = require('../models/PoseModel');

const savePose = async (req, res) => {
    try {
        const { avatarId, name, poseData } = req.body;

        if (!avatarId || !name || !poseData) {
            return res.status(400).json({ ok: false, msg: 'Faltan campos requeridos (avatarId, name, poseData).' });
        }

        // Use findOneAndUpdate with upsert: true to support re-recording (overwrite)
        const pose = await Pose.findOneAndUpdate(
            { avatarId, name },
            { poseData, isDefault: req.body.isDefault || false },
            { new: true, upsert: true }
        );

        // If this is set as default, unset others for this avatar
        if (req.body.isDefault) {
            await Pose.updateMany(
                { avatarId, _id: { $ne: pose._id } },
                { isDefault: false }
            );
        }

        res.json({
            ok: true,
            msg: 'Pose guardada correctamente.',
            pose
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al guardar la pose.' });
    }
};

const getPosesByAvatar = async (req, res) => {
    try {
        const { avatarId } = req.params;

        const poses = await Pose.find({ avatarId }).sort({ createdAt: -1 });

        res.json({
            ok: true,
            poses
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener las poses.' });
    }
};

const deletePose = async (req, res) => {
    try {
        const { id } = req.params;
        await Pose.findByIdAndDelete(id);
        res.json({ ok: true, msg: 'Pose eliminada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al eliminar la pose.' });
    }
};

const setDefaultPose = async (req, res) => {
    try {
        const { id } = req.params;
        const pose = await Pose.findById(id);
        if (!pose) return res.status(404).json({ ok: false, msg: 'Pose no encontrada.' });

        const { avatarId } = pose;

        // Unset all and set current as default
        await Pose.updateMany({ avatarId }, { isDefault: false });
        pose.isDefault = true;
        await pose.save();

        res.json({ ok: true, msg: 'Pose establecida como predeterminada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al establecer pose predeterminada.' });
    }
};

module.exports = {
    savePose,
    getPosesByAvatar,
    setDefaultPose,
    deletePose
};
