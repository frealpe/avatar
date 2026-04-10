const { Schema, model } = require('mongoose');

const PoseSchema = Schema({
    avatarId: {
        type: Schema.Types.ObjectId,
        ref: 'Avatar',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    poseData: {
        type: Object, // Stores joint names as keys and [x, y, z] arrays as values
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure unique pose names per avatar for easy upsert/overwrite
PoseSchema.index({ avatarId: 1, name: 1 }, { unique: true });

module.exports = model('Pose', PoseSchema);
