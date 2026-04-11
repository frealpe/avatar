const { Schema, model } = require('mongoose');

const ProyectoSchema = Schema({
    nombre: {
        type: String,
        required: true
    },
    idPiloto: {
        type: String,
        required: true
    },
    operador: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario'
    },
    departamento: {
        type: Schema.Types.ObjectId,
        ref: 'Departamento'
    },
    municipio: {
        type: Schema.Types.ObjectId,
        ref: 'Municipio'
    },
    estado: {
        type: String,
        default: 'Nuevo'
    },
    numeroplantulas: {
        type: String
    },
    fechacreado: {
        type: String
    },
    geoInstalacion: {
        type: String
    },
    geojsonPerimetro: {
        type: Object
    }
});

module.exports = model('Proyecto', ProyectoSchema);
