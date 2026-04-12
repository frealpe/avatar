const { response } = require('express');
const Municipio = require('../models/MunicipioModel');

const obtenerMunicipios = async (req, res = response) => {
    const { dpto } = req.query;
    try {
        const query = dpto ? { codigoDepartamento: dpto } : {};
        const municipios = await Municipio.find(query).sort({ nombre: 1 });
        res.json({
            ok: true,
            municipios
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener municipios'
        });
    }
};

module.exports = {
    obtenerMunicipios
};
