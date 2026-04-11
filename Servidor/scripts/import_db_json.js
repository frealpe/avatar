const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Departamento = require('../models/DepartamentoModel');
const Municipio = require('../models/MunicipioModel');
const Proyecto = require('../models/ProyectoModel');
const Role = require('../models/RolModel');
const Usuario = require('../models/UsuarioModel');

const dbUrl = process.env.MONGODB_CNN || 'mongodb://127.0.0.1:27017/modavatar_db';

const baseDir = path.join(__dirname, '../../Bases de datos');

/**
 * Convierte el formato de exportación de MongoDB (JSON con $oid) a objetos planos de Mongoose
 */
const transformData = (data) => {
    if (Array.isArray(data)) {
        return data.map(item => transformItem(item));
    }
    return transformItem(data);
};

const transformItem = (item) => {
    const newItem = { ...item };
    
    // Manejar _id con $oid
    if (newItem._id && newItem._id.$oid) {
        newItem._id = new mongoose.Types.ObjectId(newItem._id.$oid);
    }

    // Manejar referencias recursivamente
    for (const key in newItem) {
        if (newItem[key] && typeof newItem[key] === 'object' && newItem[key].$oid) {
            newItem[key] = new mongoose.Types.ObjectId(newItem[key].$oid);
        } else if (key === 'geojsonPerimetro') {
            // Mantener GeoJSON tal cual
        }
    }

    return newItem;
};

const importCollection = async (model, fileName) => {
    try {
        const filePath = path.join(baseDir, fileName);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Archivo no encontrado: ${fileName}`);
            return;
        }

        const rawData = fs.readFileSync(filePath, 'utf-8');
        const jsonData = JSON.parse(rawData);
        const transformedData = transformData(jsonData);

        await model.deleteMany({});
        await model.insertMany(transformedData);
        console.log(`✅ Colección ${fileName} importada exitosamente (${transformedData.length} registros).`);
    } catch (error) {
        console.error(`❌ Error al importar ${fileName}:`, error.message);
    }
};

const runImport = async () => {
    try {
        await mongoose.connect(dbUrl);
        console.log('📡 Conectado a MongoDB para la importación...');

        await importCollection(Role, 'roles');
        await importCollection(Departamento, 'departamentos');
        await importCollection(Municipio, 'municipios');
        await importCollection(Usuario, 'usuarios');
        await importCollection(Proyecto, 'proyectos');

        console.log('\n🌟 Importación completa finalizada.');
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        await mongoose.disconnect();
    }
};

runImport();
