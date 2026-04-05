const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config');

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
     * Inicia el servidor y lo pone a escuchar en el puerto especificado.
     */
    listen() {
        this.app.listen( this.port, () => {
            console.log('Servidor corriendo en puerto', this.port );
        });
    }

}

module.exports = Server;
