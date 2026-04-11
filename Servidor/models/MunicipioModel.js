const { Schema, model } = require('mongoose');

const MunicipioSchema = Schema({
    codigoDepartamento: {
        type: String,
        required: true
    },
    codigoMunicipio: {
        type: String,
        required: true,
        unique: true
    },
    departamento: {
        type: String,
        required: true
    },
    nombre: {
        type: String,
        required: true
    }
});

module.exports = model('Municipio', MunicipioSchema);
