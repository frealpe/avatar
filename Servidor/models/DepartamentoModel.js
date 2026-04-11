const { Schema, model } = require('mongoose');

const DepartamentoSchema = Schema({
    codigoDepartamento: {
        type: String,
        required: true,
        unique: true
    },
    nombre: {
        type: String,
        required: true
    }
});

module.exports = model('Departamento', DepartamentoSchema);
