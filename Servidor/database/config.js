const mongoose = require('mongoose');

const dbConnection = async () => {
    try {
        // En un entorno de producción, esto debería obtenerse de process.env.MONGODB_CNN
        const dbUrl = process.env.MONGODB_CNN || 'mongodb://127.0.0.1:27017/modavatar_db';
        
        await mongoose.connect(dbUrl);

        console.log('✅ Base de datos online conectada exitosamente (Modavatar DB)');

    } catch (error) {
        console.error('❌ Error al iniciar la base de datos:', error);
        throw new Error('Error a la hora de inicializar la base de datos');
    }
};

module.exports = {
    dbConnection
};
