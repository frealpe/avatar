const { Schema, model } = require('mongoose');

const AvatarSchema = Schema({
    userId: {
        type: String,
        required: true,
        default: 'guest_user'
    },
    modelType: {
        type: String,
        required: true,
        default: 'Anny_01'
    },
    meshUrl: {
        type: String,
        default: null
    },
    // Parámetros físicos (Anny Base Params)
    measurements: {
        height: { type: Number, required: true }, // en cm
        weight: { type: Number, required: true }, // en kg
        chest: { type: Number },
        waist: { type: Number },
        hips: { type: Number },
        shoulders: { type: Number },
        inseam: { type: Number }
    },
    // Shape params que provienen de la inferencia simulada del modelo HMR
    shapeParams: {
        type: [Number], // Array de floats. Para el simulador de Anny
        default: []
    },
    // Pattern Info Generado por Visión Local
    patternUrl: {
        type: String,
        default: null
    },
    garmentParams: {
        type: Object,
        default: {}
    },
    // Pose limits / calibración inicial
    poseParams: {
        type: [Number],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String, // 'GENERATING', 'READY', 'FAILED'
        default: 'READY'
    }
});

module.exports = model('Avatar', AvatarSchema);
