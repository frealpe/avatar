const { response } = require('express');
const Departamento = require('../models/DepartamentoModel');

const obtenerDepartamentos = async (req, res = response) => {
    try {
        const departamentos = await Departamento.find().sort({ nombre: 1 });
        res.json({
            ok: true,
            departamentos
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener departamentos'
        });
    }
};

module.exports = {
    obtenerDepartamentos
};
