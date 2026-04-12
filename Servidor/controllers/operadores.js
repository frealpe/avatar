const { response } = require('express');
const fs = require('fs');
const path = require('path');
const Operador = require('../models/OperadorModel');

// Función helper para procesar imagen base64
const procesarLogoBase64 = (base64String, operadorId) => {
    if (!base64String || !base64String.startsWith('data:image')) return base64String;

    try {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
        const extension = base64String.split(';')[0].split('/')[1];
        const fileName = `logo_${operadorId || Date.now()}_${Date.now()}.${extension}`;
        
        const dir = path.join(__dirname, '../public/uploads/logos');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }

        const uploadPath = path.join(dir, fileName);
        fs.writeFileSync(uploadPath, base64Data, 'base64');
        
        return `/uploads/logos/${fileName}`;
    } catch (error) {
        console.error('Error procesando imagen base64:', error);
        return base64String;
    }
};

const obtenerOperadores = async (req, res = response) => {
    try {
        const operadores = await Operador.find();
        res.json({
            ok: true,
            operadores
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener operadores'
        });
    }
};

const crearOperador = async (req, res = response) => {
    console.log('Petición para crear Operador:', req.body);
    
    // Procesar logo si viene como base64
    if (req.body.logo) {
        req.body.logo = procesarLogoBase64(req.body.logo);
    }

    const operador = new Operador(req.body);
    try {
        const operadorGuardado = await operador.save();
        console.log('Operador guardado:', operadorGuardado.nombre);
        res.json({
            ok: true,
            operador: operadorGuardado
        });
    } catch (error) {
        console.error('Error al crear operador:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear operador'
        });
    }
};

const actualizarOperador = async (req, res = response) => {
    const operadorId = req.params.id;
    try {
        const operador = await Operador.findById(operadorId);
        if (!operador) {
            return res.status(404).json({
                ok: false,
                msg: 'Operador no existe'
            });
        }

        // Procesar logo si viene como base64
        if (req.body.logo && req.body.logo.startsWith('data:image')) {
            req.body.logo = procesarLogoBase64(req.body.logo, operadorId);
        }

        const operadorActualizado = await Operador.findByIdAndUpdate(operadorId, req.body, { new: true });

        res.json({
            ok: true,
            operador: operadorActualizado
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar operador'
        });
    }
};

const eliminarOperador = async (req, res = response) => {
    const operadorId = req.params.id;
    try {
        const operador = await Operador.findById(operadorId);
        if (!operador) {
            return res.status(404).json({
                ok: false,
                msg: 'Operador no existe'
            });
        }

        await Operador.findByIdAndDelete(operadorId);

        res.json({
            ok: true,
            msg: 'Operador eliminado'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al eliminar operador'
        });
    }
};

module.exports = {
    obtenerOperadores,
    crearOperador,
    actualizarOperador,
    eliminarOperador
};
