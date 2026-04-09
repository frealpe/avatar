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
        if (typeof input === 'string' && fs.existsSync(input)) {
            return Buffer.from(fs.readFileSync(input)).toString("base64");
        }
    } catch (e) {
        // Ignorar error de fs
    }
    
    // Si es un string base64 con cabecera (data:image/...), la limpiamos de forma agresiva
    if (typeof input === 'string' && input.startsWith('data:image')) {
        const cleaned = input.replace(/^data:image\/\w+;base64,/, "");
        console.log(`[OLLAMA DEBUG] Imagen Base64 detectada. Longitud: ${cleaned.length}. Inicio: ${cleaned.substring(0, 30)}...`);
        return cleaned;
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
            stream: false,
            options: { num_gpu: 99 }
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
            stream: false,
            options: { num_gpu: 99 }
        });
        return response.response.trim();
    } catch (error) {
        throw new Error(`[${modelText}] Error: ${error.message}`);
    }
}

/**
 * Función que usa Llama 3 para generar la estructura XML (.val) de Seamly2D.
 * @param {string} descripcion - Descripción técnica de la prenda
 * @param {Object} parametros - Medidas base
 * @returns {Promise<string>} El XML generado
 */
async function generarEstructuraVAL(descripcion, parametros) {
    const modelText = process.env.OLLAMA_MODEL_TEXT || 'llama3';
    const prompt = `Actúa como un ingeniero de patronaje experto en Seamly2D (Valentina). 
Tu tarea es generar el código XML completo de un archivo .val compatible con la versión 0.6.0.

DESCRIPCIÓN DE LA PRENDA: ${descripcion}
MEDIDAS (cm): ${JSON.stringify(parametros)}

REGLAS CRÍTICAS:
1. El archivo debe empezar con <?xml version="1.0" encoding="UTF-8"?>.
2. Usa la estructura: <pattern><version>0.6.0</version><unit>cm</unit><draw><calculation>...</calculation></draw></pattern>.
3. Define al menos los puntos con IDs NUMÉRICOS (ej: id="1", id="2") y nombres A, A1, A2, A3 en coordenadas cartesianas.
4. Si la descripción menciona un cuello o manga, intenta definir nodos de curva (<spline>) básicos usando los IDs numéricos.
5. NO incluyas introducciones ni explicaciones. Solo devuelve el código XML puro.
6. MUY IMPORTANTE: Los IDs deben ser números enteros (1, 2, 3...) para evitar errores de validación.
7. REGLA DE ORO: NO uses el tag <m> ni <measurement> dentro del .val. Los valores de medidas se obtienen mediante sus nombres (ej: _neck_depth_cm) pero NUNCA se declaran dentro de <calculation>. El archivo .val solo debe contener la geometría y fórmulas.
8. ESTRUCTURA Y ORDEN: El XML DEBE empezar con <pattern> y contener <version>0.6.0</version>, <unit>cm</unit>, y el bloque <draw name="draft">. NO uses <draftBlock>. Dentro de <draw>, el orden DEBE ser: 1º <calculation>, 2º <modeling/>, 3º <details/>. Los tres son obligatorios.`;

    try {
        console.log(`[LLAMA3] Generando estructura compleja de patrón...`);
        const response = await ollama.generate({
            model: modelText,
            prompt: prompt,
            stream: false,
            options: { num_gpu: 99, temperature: 0.2 }
        });
        
        // Limpiar de forma agresiva para extraer solo el XML
        let text = response.response.trim();
        const xmlMatch = text.match(/<\?xml[\s\S]*?<\/pattern>/i); // Non-greedy match
        if (xmlMatch) {
            const cleanedXml = xmlMatch[0].trim();
            console.log(`[LLAMA3] XML limpio detectado (Longitud: ${cleanedXml.length})`);
            return cleanedXml;
        }
        
        // Si no hay match con XML header, intentar solo el tag pattern
        const patternMatch = text.match(/<pattern[\s\S]*?<\/pattern>/i);
        if (patternMatch) {
             console.log(`[LLAMA3] Tag <pattern> detectado, añadiendo header XML...`);
             return '<?xml version="1.0" encoding="UTF-8"?>\n' + patternMatch[0].trim();
        }

        // Fallback: limpiar bloques markdown
        let xml = text.replace(/```xml/g, "").replace(/```/g, "").trim();
        return xml;
    } catch (error) {
        console.error(`[LLAMA3 ERROR] Falló la generación del XML:`, error.message);
        return null;
    }
}

/**
 * Función principal que orquesta el pipeline completo.
 * @param {string} imagePath - Ruta local o base64 de la imagen
 * @param {string} talla - Talla esperada (ej: S, M, L)
 * @returns {Promise<Object>} Objeto JSON con descripción y parámetros validados
 */
async function procesarPrenda(imagePath, talla) {
    const { analyzeGarmentFromDescription } = require('./garment_analyzer');

    try {
        const promptVision = `Analiza esta imagen de una prenda de vestir como si fueras un experto en patronaje industrial. Describe detalladamente los siguientes puntos:

Categoría de la prenda (ej. T-shirt, camisa, pantalón).
Tipo de cuello y su profundidad estimada (v-neck, round, crew).
Tipo de manga (corta, larga, raglán, sisa, sin manga) y su largo relativo.
Ajuste al cuerpo (fit: holgado, entallado o regular).
Detalles adicionales como bolsillos, puños o pinzas.
Responde de forma técnica y concisa.`;

        const descripcion = await analizarImagen(imagePath, promptVision);

        // PIPELINE GEOMÉTRICO:
        // Usa proporciones (nunca cm directos desde la imagen) y normaliza a talla M.
        console.log(`[VISION PARSER] Aplicando pipeline proporcional talla M...`);
        const parametros = analyzeGarmentFromDescription(descripcion);

        return {
            descripcion,
            parametros
        };
    } catch (error) {
        console.error('[Error en procesarPrenda]:', error.message);

        // Fallback robusto a talla M por defecto
        console.warn('[VISION PARSER] ⚠️ Usando valores estándar talla M como fallback.');
        return {
            descripcion: 'Descripción no disponible (Ollama offline)',
            parametros: {
                neck_depth_cm: 8,
                sleeve_length_cm: 22,
                shoulder_width_cm: 44,
                waist_ease_cm: 4,
                ancho_pecho: 52,
                largo_total: 70,
                largo_manga: 22,
                fit: 'regular'
            }
        };
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
            const baseDir = path.join(process.cwd(), 'public', 'patterns');
            const vitPath = path.join(baseDir, `medidas_${Date.now()}.vit`);
            const valPath = path.join(baseDir, `patron_avanzado_${Date.now()}.val`);
            
            try {
                // 1. Guardar medidas .vit
                const finalVitPath = generarArchivoVIT(res.parametros, vitPath);
                console.log(`\n[SEAMLY2D] Exportado archivo de medidas (.vit): ${finalVitPath}`);
                
                // 2. Generar patrón .val avanzado con LLAMA3
                generarEstructuraVAL(res.descripcion, res.parametros)
                    .then(async xml => {
                        if (xml) {
                            fs.writeFileSync(valPath, xml, 'utf8');
                            console.log(`[SEAMLY2D] Patrón avanzado (.val) generado por Llama3: ${valPath}`);
                            
                            // 3. Probar generación de SVG (Headless)
                            const { generarSVG } = require('./seamly_engine');
                            console.log(`[SEAMLY2D] Iniciando exportación a SVG (Modo Headless)...`);
                            try {
                                await generarSVG(finalVitPath, valPath, baseDir);
                                console.log(`[SEAMLY2D] ¡SVG generado exitosamente sin abrir interfaz!`);
                            } catch (svgErr) {
                                console.error(`[SEAMLY2D ERROR] Falló exportación SVG:`, svgErr.message);
                            }
                        }
                    });
                    
            } catch (vitErr) {
                console.error('\n[SEAMLY2D ERROR] Falló la creación de archivos:', vitErr.message);
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
