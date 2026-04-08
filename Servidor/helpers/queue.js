const { Queue } = require('bullmq');

// Usar opciones de conexión para que BullMQ gestione sus propias conexiones
const connectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  maxRetriesPerRequest: null,
};

// Inicializar la cola para la generación de avatares
const avatarQueue = new Queue('avatarGeneration', { connection: connectionOptions });

module.exports = {
  avatarQueue,
  connection: connectionOptions
};
