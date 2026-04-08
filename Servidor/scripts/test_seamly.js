const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Ejecuta Seamly2D usando el binario instalado en el PATH del sistema.
 */
function runSeamly2D(args) {
    return new Promise((resolve, reject) => {
        // Reincorporamos la ruta absoluta hacia el AppImage según lo configurado en consola
        const seamlyPath = path.join(require('os').homedir(), 'Downloads', 'seamly2d');
        const process = spawn(seamlyPath, args);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => stdout += data.toString());
        process.stderr.on('data', (data) => stderr += data.toString());

        process.on('close', (code) => {
            if (code === 0) resolve({ stdout, stderr });
            else reject(new Error(`Error en Seamly2D (Código ${code}): ${stderr}`));
        });
        
        process.on('error', (err) => {
            if (err.code === 'ENOENT') {
                reject(new Error("Seamly2D no está en el PATH. Instálalo o verifica 'which seamly2d'"));
            } else {
                reject(new Error(`Fallo al iniciar: ${err.message}`));
            }
        });
    });
}

/**
 * Función corregida para pasar la información al binario del sistema.
 */
async function exportPattern(patternPath, vitPath, format, destDir) {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const baseName = path.basename(patternPath, path.extname(patternPath)) + "_output";

    // Argumentos optimizados para el Agente
    const args = [
        '-b', baseName,          // Nombre de salida
        '-m', vitPath,           // MEDIDAS (Vital para la personalización)
        '-f', format.toString(),  // 0=SVG, 7=OBJ
        '-d', destDir,           // Directorio
        '--exportOnlyDetails',    // Extrae las piezas para la costura digital
        patternPath               // Archivo de diseño base
    ];
    
    console.log(`--- Agente procesando patrón en nicolas ---`);

    try {
        const result = await runSeamly2D(args);
        const ext = format === 0 ? 'svg' : 'obj';
        return path.join(destDir, `${baseName}.${ext}`);
    } catch (err) {
        throw err;
    }
}

// Bloque principal para pruebas
if (require.main === module) {
    console.log('\n--- Ejecutando prueba de inyección dinámica para Seamly2D ---');
    
    // Ejemplo de cómo el agente inyecta información dinámica
    const alturaUsuario = 185; 
    const cinturaUsuario = 90;

    const xmlMedidas = `<?xml version="1.0" encoding="UTF-8"?>
<vit>
    <measurements>
        <m name="height" value="${alturaUsuario}"/>
        <m name="p_waist_circ" value="${cinturaUsuario}"/>
    </measurements>
</vit>`;

    // Guardamos las medidas temporales
    const vitTemporal = path.join(__dirname, 'temp_user.vit');
    fs.writeFileSync(vitTemporal, xmlMedidas);

    // Asumimos que el patrón está en la raíz de Servidor
    const patronPrueba = path.join(__dirname, '..', 'patron_maestro.val');
    const folderSalida = path.join(__dirname, '..', 'public', 'disenos');

    if (!fs.existsSync(patronPrueba)) {
        console.warn(`[Advertencia] No se ha encontrado el archivo de prueba en: ${patronPrueba}`);
        console.warn('Se intentará ejecutar de igual forma, pero Seamly2D devolverá un error.');
    }

    // Ejecutamos Seamly2D con la "librería instalada"
    exportPattern(patronPrueba, vitTemporal, 0, folderSalida)
        .then(file => {
            console.log("Agente: Diseño listo para enviar al frontend:", file);
            // Limpieza del temporal en caso de éxito
            if (fs.existsSync(vitTemporal)) fs.unlinkSync(vitTemporal);
        })
        .catch(err => {
            console.error("Error en la prueba:", err.message);
            // Limpieza del temporal en caso de error
            if (fs.existsSync(vitTemporal)) fs.unlinkSync(vitTemporal);
        });
}

module.exports = {
    runSeamly2D,
    exportPattern
};