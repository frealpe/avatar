const { Schema, model } = require('mongoose');

const PrendaSchema = Schema({
    name: {
        type: String,
        required: [true, 'El nombre es obligatorio']
    },
    categoria: {
        type: String,
        required: [true, 'La categoría es obligatoria'],
        enum: ['CAMISAS', 'PANTALONES', 'SACOS', 'BOXERS', 'BLUZAS', 'VESTIDOS', 'FALDAS']
    },
    marca: {
        type: String,
        default: 'ANNY'
    },
    talla: {
        type: String,
        default: 'M'
    },
    prenda3D: {
        type: String,
        required: [true, 'La ruta al modelo 3D es obligatoria']
    },
    image: {
        type: String
    },
    price: {
        type: Number,
        default: 0
    },
    normal: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        z: { type: Number, default: 1 }
    },
    measurements: {
        ancho_cm: { type: Number, default: 0 },
        largo_cm: { type: Number, default: 0 },
        profundidad_cm: { type: Number, default: 0 },
        pecho_cm: { type: Number, default: 0 },
        cintura_cm: { type: Number, default: 0 },
        brazo_cm: { type: Number, default: 0 }
    },
    fittedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Avatar'
    },
    isFitted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

PrendaSchema.methods.toJSON = function() {
    const { __v, ...data } = this.toObject();
    return data;
};

module.exports = model('Prenda', PrendaSchema);
