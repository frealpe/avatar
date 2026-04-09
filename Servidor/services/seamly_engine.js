const fs = require('fs');
const path = require('path');

/**
 * Convierte un objeto JSON de medidas en un archivo .vit XML de SeamlyMe/Seamly2D
 * @param {Object} parametros - Objeto clave-valor con las medidas estimadas
 * @param {string} outputPath - Ruta de salida para el archivo .vit a crear
 * @returns {string} La ruta absoluta donde se guardó el archivo
 */
function generarArchivoVIT(parametros, outputPath) {
    let medicionesXML = '';
    
    for (const [key, value] of Object.entries(parametros)) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            medicionesXML += `            <m name="${key}" value="${numValue.toFixed(2)}" description="" full_description=""/>\n`;
        } else {
            console.warn(`[SEAMLY_ENGINE] Valor no numérico detectado para ${key}: ${value}. Saltando.`);
        }
    }

    const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<vit>
    <version>0.3.3</version>
    <read-only>false</read-only>
    <unit>cm</unit>
    <pm_system>998</pm_system>
    <personal>
${medicionesXML.trimEnd()}
    </personal>
</vit>`;

    // Asegurar que el directorio contenedor existe
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, xmlTemplate, 'utf8');
    return outputPath;
}

/**
 * Llama a la CLI de Seamly2D como un proceso hijo para exportar un SVG final.
 * Nota: Asume que el usuario tiene seamly2d en /home/fabio/Downloads/seamly2d (basado en el escaneo).
 * 
 * @param {string} vitPath - Archivo de medidas generado por la IA
 * @param {string} valPath - Archivo del patrón base (armado por patronista)
 * @param {string} outDirPath - Directorio done se exportará el .svg
 * @returns {Promise<string>}
 */
function generarSVG(vitPath, valPath, outDirPath) {
    const { exec } = require('child_process');
    
    // Sanitización preventiva: Eliminar tags incompatibles como <incremental/> y atributos label
    try {
        let valContent = fs.readFileSync(valPath, 'utf8');
        let modified = false;

        if (valContent.includes('<incremental/>') || valContent.includes('<incremental></incremental>')) {
            console.log(`[SEAMLY_ENGINE] Sanitizando ${path.basename(valPath)}: Eliminando tag <incremental>...`);
            valContent = valContent.replace(/<incremental\/>/g, '');
            valContent = valContent.replace(/<incremental><\/incremental>/g, '');
            modified = true;
        }

        // Eliminar CUALQUIER atributo label="..." o label='...' en el archivo XML
        if (valContent.includes('label=')) {
            console.log(`[SEAMLY_ENGINE] Sanitización PROFUNDA en ${path.basename(valPath)}: Eliminando todos los atributos 'label'...`);
            valContent = valContent.replace(/\slabel\s?=\s?["'][^"']*["']/g, '');
            modified = true;
        }

        // Eliminar tags <m> o <measurement> alucinados por el LLM en el .val (solo permitidos en .vit)
        if (valContent.includes('<m') || valContent.includes('<measurement')) {
            console.log(`[SEAMLY_ENGINE] Sanitización de ESTRUCTURA: Eliminando tags <m> y <measurement> del .val...`);
            valContent = valContent.replace(/<m\s?[^>]*\/>/g, '');
            valContent = valContent.replace(/<m>[\s\S]*?<\/m>/g, '');
            valContent = valContent.replace(/<measurement\s?[^>]*\/>/g, '');
            valContent = valContent.replace(/<measurement>[\s\S]*?<\/measurement>/g, '');
            modified = true;
        }

        // Asegurar orden de tags: calculation -> modeling -> details
        // Si modeling o details están en el lugar equivocado, o faltan, el CLI falla.
        const blocks = ['draw', 'draftBlock'];
        for (const blockName of blocks) {
            // Buscamos el tag independientemente de si es <draw> o <draftBlock> con cualquier atributo
            const startTagRegex = new RegExp(`<${blockName}[^>]*>`, 'i');
            const endTagRegex = new RegExp(`</${blockName}>`, 'i');
            
            const startMatch = valContent.match(startTagRegex);
            const endMatch = valContent.match(endTagRegex);

            if (startMatch && endMatch) {
                console.log(`[SEAMLY_ENGINE] Verificando secuencia de tags en <${blockName}>...`);
                
                let startIndex = startMatch.index + startMatch[0].length;
                let endIndex = endMatch.index;
                
                // Si es draftBlock, lo convertimos a <draw name="draft">
                if (blockName === 'draftBlock') {
                    console.log(`[SEAMLY_ENGINE] Transformando legacy <draftBlock> a modern <draw>...`);
                    valContent = valContent.replace(startMatch[0], '<draw name="draft">');
                    valContent = valContent.replace(endMatch[0], '</draw>');
                    // Recalcular índices después del reemplazo
                    const newStartMatch = valContent.match(/<draw[^>]*>/i);
                    const newEndMatch = valContent.match(/<\/draw>/i);
                    startIndex = newStartMatch.index + newStartMatch[0].length;
                    endIndex = newEndMatch.index;
                }

                let content = valContent.substring(startIndex, endIndex);
                
                // 1. Limpiar tags modeling/details existentes para reinsertarlos al final de forma controlada
                content = content.replace(/<modeling[\s\S]*?\/>/g, '');
                content = content.replace(/<modeling>[\s\S]*?<\/modeling>/g, '');
                content = content.replace(/<details[\s\S]*?\/>/g, '');
                content = content.replace(/<details>[\s\S]*?<\/details>/g, '');
                content = content.replace(/<pieces[\s\S]*?\/>/g, ''); // Hallucinación común
                content = content.replace(/<pieces>[\s\S]*?<\/pieces>/g, '');
                
                // 2. Reinsertar en el orden correcto al final del bloque
                let newContent = content.trimEnd();
                newContent += '\n        <modeling/>';
                newContent += '\n        <details/>';
                
                // 3. Reemplazar en el contenido total
                valContent = valContent.substring(0, startIndex) + newContent + '\n    ' + valContent.substring(endIndex);
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(valPath, valContent, 'utf8');
        }
    } catch (sanErr) {
        console.warn(`[SEAMLY_ENGINE] Advertencia en sanitización: ${sanErr.message}`);
    }

    return new Promise((resolve, reject) => {
        // En Linux, usar el path completo al AppImage u ejecutable compilado.
        // Intentar encontrar el ejecutable en rutas comunes
        const seamlyPaths = [
            '/usr/bin/seamly2d',
            '/home/fabio/Downloads/seamly2d',
            'seamly2d'
        ];
        
        let seamlyCmd = '/home/fabio/Downloads/seamly2d'; // Fallback
        for (const p of seamlyPaths) {
            if (fs.existsSync(p)) {
                 seamlyCmd = p;
                 break;
            }
        }
        
        // Ejecución básica CLI: seamly2d -m [vit] -d [outDir] -f svg [val]
        // -b: Habilita el modo consola (headless) usando un nombre base para los archivos de salida
        const baseName = path.basename(valPath, '.val');
        const command = `"${seamlyCmd}" -m "${vitPath}" -d "${outDirPath}" -f svg -b "${baseName}" "${valPath}"`;
        
        console.log(`[SEAMLY_ENGINE] Ejecutando bash (Headless Mode): ${command}`);
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(`Error invocando Seamly2D CLI: ${error.message}\n${stderr}`));
            }
            // Retorna que fue exitoso
            resolve(outDirPath);
        });
    });
}

module.exports = {
    generarArchivoVIT,
    generarSVG
};
