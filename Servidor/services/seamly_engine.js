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
        medicionesXML += `            <m name="${key}" value="${value}" description="" full_description=""/>\n`;
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
            // Regex para capturar label con comillas dobles o simples y cualquier espacio intermedio
            valContent = valContent.replace(/\slabel\s?=\s?["'][^"']*["']/g, '');
            modified = true;
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
