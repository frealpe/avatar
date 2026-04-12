const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config');
const { Server: SocketServer } = require('socket.io');
const http = require('http');
const { setupWorker } = require('../workers/avatarWorker');

/**
 * Clase que representa el servidor de la aplicación.
 * Configura los middlewares, las rutas y el puerto de escucha.
 */
class Server {

    constructor() {
        /**
         * Aplicación de Express.
         * @type {express.Application}
         */
        this.app  = express();
        
        // Configurar servidor HTTP y Socket.IO
        this.server = http.createServer(this.app);
        this.io = new SocketServer(this.server, {
            cors: { origin: "*" }
        });
        this.app.set('io', this.io);

        /**
         * Puerto en el que correrá el servidor.
         * @type {string|number}
         */
        this.port = process.env.PORT;

        /**
         * Ruta base para autenticación.
         * @type {string}
         */
        this.authPath = '/api/auth';

        /**
         * Ruta base para las APIs relacionadas con usuarios.
         * @type {string}
         */
        this.usuariosPath = '/api/usuarios';

        /**
         * Ruta base para patrones y Seamly2D.
         * @type {string}
         */
        this.patternsPath = '/api/patterns';

        // Conectar a base de datos
        this.conectarDB();

        // Middlewares: Funciones que añaden funcionalidad al web server
        this.middlewares();

        // Rutas de mi aplicación
        this.routes();

        // Sockets
        this.sockets();

        // Workers
        this.workers();
    }

    async conectarDB() {
        await dbConnection();
    }

    /**
     * Define y configura los middlewares globales de la aplicación.
     */
    middlewares() {

        // CORS: Habilita el Intercambio de Recursos de Origen Cruzado
        this.app.use( cors() );

        // Lectura y parseo del body: Permite leer JSON en las peticiones
        this.app.use( express.json({ limit: '50mb' }) );
        this.app.use( express.urlencoded({ limit: '50mb', extended: true }) );

        // Directorio Público: Define la carpeta para archivos estáticos
        this.app.use( express.static('public') );

    }

    /**
     * Define las rutas de la aplicación vinculando los endpoints con sus archivos de rutas.
     */
    routes() {
        this.app.use( this.authPath, require('../routes/auth'));
        this.app.use( this.usuariosPath, require('../routes/usuarios'));
        this.app.use( '/api/avatar', require('../routes/avatar'));
        this.app.use( '/api/pose', require('../routes/pose'));
        this.app.use( '/api/proyectos', require('../routes/proyectos'));
        this.app.use( '/api/operadores', require('../routes/operadores'));
        this.app.use( '/api/municipios', require('../routes/municipios'));
        this.app.use( '/api/departamentos', require('../routes/departamentos'));
        this.app.use( this.patternsPath, require('../routes/patterns'));
    }

    /**
     * Configuración de eventos de Socket.io
     */
    sockets() {
        this.io.on('connection', (socket) => {
            console.log('Cliente socket conectado:', socket.id);
            socket.on('disconnect', () => {
                console.log('Cliente socket desconectado:', socket.id);
            });

            // Reemitir vistas previas de avatar (betas) a otros clientes para preview en tiempo real
            socket.on('avatar:preview', (payload) => {
                try {
                    // No hacemos procesamiento pesado aquí; simplemente reenviamos a otros clientes
                    // para que el Probador / otros UIs muestren la previsualización en tiempo real.
                    socket.broadcast.emit('avatar:preview', payload);
                } catch (err) {
                    console.error('Error re-emitiendo avatar:preview:', err);
                }
            });
            // Reemitir vistas previas de pose a otros clientes para preview en tiempo real
            socket.on('pose:preview', (payload) => {
                try {
                    socket.broadcast.emit('pose:preview', payload);
                } catch (err) {
                    console.error('Error re-emitiendo pose:preview:', err);
                }
            });
        });
    }

    /**
     * Configuración e inicialización de workers para procesamiento en background (BullMQ).
     */
    workers() {
        setupWorker(this.io);
    }

    /**
     * Inicia el servidor HTTP y lo pone a escuchar en el puerto especificado.
     */
    listen() {
        this.server.listen( this.port, () => {
            console.log('Servidor corriendo en puerto', this.port );
        });
        
        // Increase global timeouts for AI Gradio Inference
        this.server.timeout = 300000; // 5 minutes
    }

}

module.exports = Server;
