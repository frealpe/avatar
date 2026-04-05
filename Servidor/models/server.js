const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config');
const { Server: SocketServer } = require('socket.io');
const http = require('http');

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
         * Ruta base para las APIs relacionadas con usuarios.
         * @type {string}
         */
        this.usuariosPath = '/api/usuarios';

        // Conectar a base de datos
        this.conectarDB();

        // Middlewares: Funciones que añaden funcionalidad al web server
        this.middlewares();

        // Rutas de mi aplicación
        this.routes();

        // Sockets
        this.sockets();
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
        this.app.use( express.json() );

        // Directorio Público: Define la carpeta para archivos estáticos
        this.app.use( express.static('public') );

    }

    /**
     * Define las rutas de la aplicación vinculando los endpoints con sus archivos de rutas.
     */
    routes() {
        this.app.use( this.usuariosPath, require('../routes/usuarios'));
        this.app.use( '/api/avatar', require('../routes/avatar'));
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
        });
    }

    /**
     * Inicia el servidor HTTP y lo pone a escuchar en el puerto especificado.
     */
    listen() {
        this.server.listen( this.port, () => {
            console.log('Servidor corriendo en puerto', this.port );
        });
    }

}

module.exports = Server;
