require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Ollama } = require('ollama');
const { generarArchivoVIT } = require('./seamly_engine');

// Inicializar un cliente custom de Ollama apuntando al host configurado
const ollama = new Ollama({ 
    host: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' 
});

/**
 * Convierte un archivo local a base64, si es una ruta válida.
 * Si no es una ruta, asume que ya es un base64.
 * @param {string} input - Ruta local de la imagen o string en base64
 * @returns {string} String en base64 de la imagen
 */
function fileToBase64(input) {
    try {
        if (fs.existsSync(input)) {
            return Buffer.from(fs.readFileSync(input)).toString("base64");
        }
    } catch (e) {
        // Ignorar error de fs y asumir que es base64
    }
    return input;
}

/**
 * Función que simula el modelo de visión pidiendo el análisis de imagen.
 * @param {string} imagen - Ruta o base64
 * @param {string} prompt - Instrucción exacta para el modelo
 * @returns {Promise<string>} Descripción de la prenda
 */
async function analizarImagen(imagen, prompt) {
    const imageB64 = fileToBase64(imagen);
    const modelVision = process.env.OLLAMA_MODEL_VISION || 'llava';
    try {
        const response = await ollama.generate({
            model: modelVision,
            prompt: prompt,
            images: [imageB64],
            stream: false
        });
        return response.response.trim();
    } catch (error) {
        throw new Error(`[${modelVision}] Error: ${error.message}`);
    }
}

/**
 * Función que simula el modelo de lenguaje procesando parámetros a JSON.
 * @param {string} descripcion - Resultado del modelo de visión
 * @param {string} prompt - Instrucción exacta para la extracción
 * @returns {Promise<string>} String que debe contener el JSON
 */
async function generarParametros(descripcion, prompt) {
    const modelText = process.env.OLLAMA_MODEL_TEXT || 'llama3';
    try {
        const response = await ollama.generate({
            model: modelText,
            prompt: prompt,
            format: 'json',
            stream: false
        });
        return response.response.trim();
    } catch (error) {
        throw new Error(`[${modelText}] Error: ${error.message}`);
    }
}

/**
 * Función principal que orquesta el pipeline completo.
 * @param {string} imagen - Ruta local o base64 de la imagen
 * @param {string} talla - Talla esperada (ej: S, M, L)
 * @returns {Promise<Object>} Objeto JSON con descripción y parámetros validados
 */
async function procesarPrenda(imagen, talla) {
    try {
        const promptVision = `Analiza esta imagen de una prenda de vestir como si fueras un experto en patronaje industrial. Describe detalladamente los siguientes puntos:

Categoría de la prenda (ej. T-shirt, camisa, pantalón).
Tipo de cuello y su profundidad estimada (v-neck, round, crew).
Tipo de manga (corta, larga, raglán, sisa) y su largo relativo.
Ajuste al cuerpo (fit: holgado, entallado o regular).
Detalles adicionales como bolsillos, puños o pinzas.
Responde de forma técnica y concisa.`;

        const descripcion = await analizarImagen(imagen, promptVision);

        const promptTexto = `Actúa como un traductor de diseño de moda a parámetros de Seamly2D. A continuación te daré una descripción técnica de una prenda. Tu tarea es extraer las medidas de diseño y devolver exclusivamente un objeto JSON.

Variables a usar: neck_depth_cm, sleeve_length_cm, waist_ease_cm, shoulder_width_cm.

Descripción: ${descripcion}
Talla: ${talla}

Reglas:

* Si no se menciona una medida, estima un valor estándar basado en la talla.
* No incluyas explicaciones ni texto adicional.
* Solo devuelve el objeto JSON.`;

        const parametrosRaw = await generarParametros(descripcion, promptTexto);
        
        let parametrosPayload;
        try {
            parametrosPayload = JSON.parse(parametrosRaw);
        } catch (e) {
            throw new Error('El modelo de texto no devolvió un JSON válido. Respuesta: ' + parametrosRaw);
        }

        const keysRequeridas = ["neck_depth_cm", "sleeve_length_cm", "waist_ease_cm", "shoulder_width_cm"];
        const parametros = {};
        
        // Diccionario de defaults basado ligeramente en la talla M por si el LLM local falla al responder
        const fallbacksLLM = {
            "neck_depth_cm": 10,
            "sleeve_length_cm": 60,
            "waist_ease_cm": 4,
            "shoulder_width_cm": 40
        };

        for (const key of keysRequeridas) {
            let valor = parametrosPayload[key];
            if (valor === undefined || valor === null) {
                console.warn(`\n[ADVERTENCIA] El LLM falló al generar la variable '${key}'. Usando valor estándar por defecto (${fallbacksLLM[key]} cm) debido a limitaciones del modelo local.`);
                valor = fallbacksLLM[key];
            }
            
            const numero = Number(valor);
            if (isNaN(numero)) {
                console.warn(`\n[ADVERTENCIA] El LLM generó basura en '${key}'. Usando fallback (${fallbacksLLM[key]} cm).`);
                parametros[key] = fallbacksLLM[key];
            } else {
                parametros[key] = numero;
            }
        }

        return {
            descripcion,
            parametros
        };
    } catch (error) {
        console.error('[Error en procesarPrenda]:', error.message);
        throw error;
    }
}

// Bloque de prueba de ejecución
if (require.main === module) {
    // Si estás corriendo localmente, asegúrate de que estás en la raíz del proyecto para que dotenv funcione.
    // Ej: `node services/vision_parser.js ./camisa.jpg M`
    const testImage = process.argv[2];
    const testTalla = process.argv[3] || "M";
    
    if (!testImage) {
        console.log('Uso: node services/vision_parser.js <ruta_a_imagen> [talla]');
        process.exit(1);
    }
    
    console.log(`Ejecutando prueba para imagen: ${testImage} (Talla: ${testTalla})...`);
    console.log(`Host servidor IA: ${process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'}`);
    console.log(`Vision Model: ${process.env.OLLAMA_MODEL_VISION || 'llava'}`);
    console.log(`Text Model: ${process.env.OLLAMA_MODEL_TEXT || 'llama3'}`);
    
    procesarPrenda(testImage, testTalla)
        .then(res => {
            console.log('\n-- RESULTADO --');
            console.log(JSON.stringify(res, null, 2));
            console.log('---------------');
            
            // Exportar a Seamly2D (.vit format)
            const vitPath = path.join(process.cwd(), 'public', 'patterns', 'medidas_extraidas.vit');
            try {
                const finalPath = generarArchivoVIT(res.parametros, vitPath);
                console.log(`\n[SEAMLY2D] Exportado exitosamente archivo de medidas (.vit):`);
                console.log(finalPath);
            } catch (vitErr) {
                console.error('\n[SEAMLY2D ERROR] Falló la creación del archivo .vit:', vitErr.message);
            }
        })
        .catch(err => {
            console.error('\n-- ERROR --');
            console.error(err.message);
            process.exit(1);
        });
}

module.exports = {
    procesarPrenda,
    analizarImagen,
    generarParametros
};
