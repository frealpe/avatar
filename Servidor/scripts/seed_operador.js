require('dotenv').config();
const mongoose = require('mongoose');
const Operador = require('../models/OperadorModel');

const seedOperador = async () => {
    try {
        const dbUrl = process.env.MONGODB_CNN || 'mongodb://127.0.0.1:27017/modavatar_db';
        await mongoose.connect(dbUrl);
        console.log('Conectado a la base de datos');

        const operadorData = {
            _id: '656f9ccb818377374106dd4d',
            nombre: 'Vanti',
            logo: 'vanti.jpg'
        };

        // Verificar si ya existe
        const existe = await Operador.findById(operadorData._id);
        if (existe) {
            console.log('El operador ya existe');
        } else {
            const nuevoOperador = new Operador(operadorData);
            await nuevoOperador.save();
            console.log('Operador creado exitosamente:', nuevoOperador.nombre);
        }

    } catch (error) {
        console.error('Error al insertar el operador:', error);
    } finally {
        await mongoose.disconnect();
    }
};

seedOperador();
