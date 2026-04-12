const { response } = require('express');
const Proyecto = require('../models/ProyectoModel');

const obtenerProyectos = async (req, res = response) => {
    try {
        const proyectos = await Proyecto.find()
            .populate('operador', 'nombre logo')
            .populate('departamento', 'nombre')
            .populate('municipio', 'nombre');

        res.json({
            ok: true,
            proyectos
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener proyectos'
        });
    }
};

const crearProyecto = async (req, res = response) => {
    const proyecto = new Proyecto(req.body);
    try {
        const proyectoGuardado = await proyecto.save();
        res.json({
            ok: true,
            proyecto: proyectoGuardado
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear proyecto'
        });
    }
};

const actualizarProyecto = async (req, res = response) => {
    const proyectoId = req.params.id;
    try {
        const proyectoActualizado = await Proyecto.findByIdAndUpdate(proyectoId, req.body, { new: true });
        res.json({
            ok: true,
            proyecto: proyectoActualizado
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar proyecto'
        });
    }
};

const eliminarProyecto = async (req, res = response) => {
    const proyectoId = req.params.id;
    try {
        await Proyecto.findByIdAndDelete(proyectoId);
        res.json({
            ok: true,
            msg: 'Proyecto eliminado'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al eliminar proyecto'
        });
    }
};

module.exports = {
    obtenerProyectos,
    crearProyecto,
    actualizarProyecto,
    eliminarProyecto
};
