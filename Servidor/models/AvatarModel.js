const { Schema, model } = require('mongoose');

const AvatarSchema = Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    modelType: {
        type: String,
        required: true,
        default: 'Anny_01'
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'neutral'],
        default: 'neutral'
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
    // Clasificación de talla sugerida para el sistema colombiano
    tallaSugerida: {
        type: String,
        enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        default: 'M'
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
    prenda3D: {
        type: String, // Main garment GLB
        default: null
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
