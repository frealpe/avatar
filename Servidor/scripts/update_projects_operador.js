require('dotenv').config();
const mongoose = require('mongoose');
const Proyecto = require('../models/ProyectoModel');

const updateProjects = async () => {
    try {
        const dbUrl = process.env.MONGODB_CNN || 'mongodb://127.0.0.1:27017/modavatar_db';
        await mongoose.connect(dbUrl);
        console.log('Conectado a la base de datos');

        const vantiId = '656f9ccb818377374106dd4d';
        
        // Actualizar todos los proyectos que no tengan operador o todos para prueba
        const result = await Proyecto.updateMany({}, { $set: { operador: vantiId } });
        console.log(`Proyectos actualizados: ${result.modifiedCount}`);

    } catch (error) {
        console.error('Error al actualizar proyectos:', error);
    } finally {
        await mongoose.disconnect();
    }
};

updateProjects();
