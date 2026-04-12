const { Schema, model } = require('mongoose');

const OperadorSchema = Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio']
    },
    logo: {
        type: String
    },
    estado: {
        type: Boolean,
        default: true
    }
});

module.exports = model('Operador', OperadorSchema);
