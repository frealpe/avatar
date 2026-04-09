/**
 * @fileoverview Seamly2D Engine - Motor Industrial de Patronaje
 * 
 * Genera archivos .vit (medidas) y .val (patrón) 100% compatibles con Seamly2D CLI.
 * Implementa sanitización agresiva de XML para datos provenientes de IA.
 * 
 * REGLAS CLAVE DE SEAMLY2D:
 * - <point type="single"> solo acepta NÚMEROS literales en x/y (NO fórmulas)
 * - El .vit usa <m name="..." value="..."/> dentro de <personal>
 * - El .val usa <draw name="..."> con <calculation>, <modeling/>, <details/>
 * - Cualquier carácter no-ASCII en el XML causa "invalid character encountered"
 */

'use strict';

const fs = require('fs');
const path = require('path');

// =============================================================================
// SANITIZACIÓN INDUSTRIAL
// =============================================================================

/**
 * Sanitiza un valor para uso en XML de Seamly2D.
 * Convierte a número con punto decimal. Elimina caracteres no-ASCII.
 * @param {*} value - Valor crudo (puede venir de IA)
 * @returns {string|null} Valor limpio como string numérico, o null si inválido
 */
function sanitizeValue(value) {
    if (value === null || value === undefined) return null;

    let str = String(value);

    // 1. Reemplazar comas por puntos (52,5 → 52.5)
    str = str.replace(/,/g, '.');

    // 2. Eliminar TODO carácter que no sea dígito, punto, o signo negativo
    str = str.replace(/[^0-9.\-]/g, '');

    // 3. Manejar múltiples puntos (tomar solo el primero)
    const parts = str.split('.');
    if (parts.length > 2) {
        str = parts[0] + '.' + parts.slice(1).join('');
    }

    // 4. Convertir a número y validar
    const num = parseFloat(str);
    if (isNaN(num) || !isFinite(num)) return null;

    return num.toFixed(2);
}

/**
 * Sanitiza un nombre de medida para uso industrial en Seamly2D.
 * Solo permite nombres que cumplan con /^[a-zA-Z_][a-zA-Z0-9_]*$/
 * 
 * @param {string} name - Nombre crudo proveniente de IA o UI
 * @returns {string} Nombre sanitizado (siempre empieza con @ en el XML final)
 */
function sanitizeMeasurementName(name) {
    if (!name || typeof name !== 'string') return `auto_${Math.random().toString(36).substr(2, 5)}`;

    // 1. Eliminar caracteres especiales prohibidos
    let clean = name.replace(/[@#$%^&*()\s\-\+\=]/g, '_');

    // 2. Transliterar caracteres comunes (opcional, pero ayuda)
    clean = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 3. Regex industrial: Solo alfanuméricos y guión bajo
    clean = clean.replace(/[^a-zA-Z0-9_]/g, '');

    // 4. Garantizar que empiece con letra o guión bajo
    if (!/^[a-zA-Z_]/.test(clean)) {
        clean = 'm_' + clean;
    }

    // 5. Fallback si quedó vacío
    if (clean.length === 0) {
        clean = `auto_${Math.random().toString(36).substr(2, 5)}`;
    }

    return clean;
}

/**
 * Limpia y valida un objeto de medidas proveniente de IA.
 * @param {Object} data - Objeto clave-valor con medidas
 * @returns {Object} Objeto limpio con solo pares nombre:valor numérico válidos
 */
function cleanAIOutput(data) {
    const cleaned = {};
    for (const [rawKey, rawValue] of Object.entries(data)) {
        const cleanName = sanitizeMeasurementName(rawKey);
        const cleanValue = sanitizeValue(rawValue);

        if (cleanName && cleanValue !== null) {
            cleaned[cleanName] = cleanValue;
        } else {
            console.warn(`[ENGINE] WARNING: Descartado: ${rawKey}=${rawValue} (nombre: ${cleanName}, valor: ${cleanValue})`);
        }
    }
    return cleaned;
}

/**
 * Valida un string XML completo, carácter por carácter.
 * @param {string} xml - XML a validar
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateXML(xml) {
    const errors = [];

    // 1. Detectar caracteres fuera del rango ASCII seguro para XML
    for (let i = 0; i < xml.length; i++) {
        const code = xml.charCodeAt(i);
        // Permitir: tab (9), newline (10), carriage return (13), espacio-tilde (32-126)
        if (code !== 9 && code !== 10 && code !== 13 && (code < 32 || code > 126)) {
            errors.push(`Carácter inválido en posición ${i}: U+${code.toString(16).padStart(4, '0')} (char: "${xml[i]}")`);
        }
    }

    // 2. Verificar que empiece con declaración XML
    if (!xml.trimStart().startsWith('<?xml')) {
        errors.push('Falta declaración <?xml ...?>');
    }

    // 3. Verificar atributos vacíos (value="" es válido, pero value= sin comillas no)
    const brokenAttrs = xml.match(/\w+=(?!["'])/g);
    if (brokenAttrs) {
        errors.push(`Atributos sin comillas detectados: ${brokenAttrs.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
}

// =============================================================================
// GENERACIÓN DE .VIT (Archivo de Medidas)
// =============================================================================

/**
 * Genera un archivo .vit XML válido para SeamlyMe/Seamly2D.
 * Aplica sanitización completa a todas las medidas.
 * 
 * @param {Object} parametros - Objeto clave-valor con medidas (puede contener basura de IA)
 * @param {string} outputPath - Ruta de salida para el archivo .vit
 * @returns {string} Ruta absoluta del archivo generado
 */
function generarArchivoVIT(parametros, outputPath) {
    // 1. Limpiar datos de IA
    const cleanParams = cleanAIOutput(parametros);
    const keys = Object.keys(cleanParams);

    if (keys.length === 0) {
        throw new Error('[SEAMLY_ENGINE] No hay medidas válidas después de sanitización. Abortando.');
    }

    // 2. Generar XML de medidas
    //    REGLA INDUSTRIAL: Nombres custom SIEMPRE empiezan con @ en Seamly2D
    let medicionesXML = '';
    for (const [name, value] of Object.entries(cleanParams)) {
        const safeName = name.startsWith('@') ? name : `@${name}`;
        medicionesXML += `    <m name="${safeName}" value="${value}"/>\n`;
    }

    // 3. Ensamblar plantilla .vit INDUSTRIAL
    // SCHEMA v0.3.3 REQUERIDO: version → read-only → notes → unit → pm_system → personal → body-measurements
    const xmlTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<vit>
  <version>0.3.3</version>
  <read-only>false</read-only>
  <notes/>
  <unit>cm</unit>
  <pm_system>998</pm_system>
  <personal>
    <family-name>AI</family-name>
    <given-name>Generated</given-name>
    <birth-date>2000-01-01</birth-date>
    <gender>unknown</gender>
    <email/>
  </personal>
  <body-measurements>
${medicionesXML.trimEnd()}
  </body-measurements>
</vit>`;

    // 4. Validar XML final
    const validation = validateXML(xmlTemplate);
    if (!validation.valid) {
        console.error(`[SEAMLY_ENGINE] ❌ Validación XML del .vit falló:`);
        validation.errors.forEach(e => console.error(`  → ${e}`));
        throw new Error(`[SEAMLY_ENGINE] XML del .vit contiene errores: ${validation.errors[0]}`);
    }

    // 5. Escribir archivo
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, xmlTemplate, 'utf8');
    console.log(`[SEAMLY_ENGINE] ✅ .vit generado (${keys.length} medidas): ${path.basename(outputPath)}`);
    console.log(`[SEAMLY_ENGINE]    Medidas: ${keys.map(k => `${k}=${cleanParams[k]}`).join(', ')}`);

    return outputPath;
}

// =============================================================================
// GENERACIÓN DINÁMICA DE .VAL (Archivo de Patrón)
// =============================================================================

/**
 * Genera un archivo .val con valores numéricos literales inyectados directamente.
 * 
 * REGLA CLAVE: Seamly2D <point type="single"> solo acepta NÚMEROS en x/y.
 * Las fórmulas solo funcionan en tipos como endOfLine, alongLine, etc.
 * Por eso inyectamos los valores numéricos directamente en el XML.
 * 
 * @param {Object} params - Medidas sanitizadas
 * @param {string} vitFileName - Nombre del archivo .vit asociado
 * @param {string} outputPath - Ruta de salida del .val
 * @returns {string} Ruta absoluta del archivo generado
 */
function generarArchivoVAL(params, vitFileName, outputPath) {
    // Valores con defaults seguros
    const ancho = parseFloat(params.ancho_pecho || params['@ancho_pecho'] || '52.00');
    const largo = parseFloat(params.largo_total || params['@largo_total'] || '70.00');

    const valXML = `<?xml version="1.0" encoding="UTF-8"?>
<pattern>
    <version>0.6.0</version>
    <unit>cm</unit>
    <description>Patron base</description>
    <notes/>
    <measurements>${vitFileName}</measurements>
    <draw name="drawing">
        <calculation>
            <point id="1" name="A" type="single" x="0" y="0"/>
            <point id="2" name="B" type="single" x="${ancho.toFixed(2)}" y="0"/>
            <point id="3" name="C" type="single" x="0" y="${(-largo).toFixed(2)}"/>
            <point id="4" name="D" type="single" x="${ancho.toFixed(2)}" y="${(-largo).toFixed(2)}"/>
            <line id="5" firstPoint="1" secondPoint="2" typeLine="hair" lineColor="black"/>
            <line id="6" firstPoint="2" secondPoint="4" typeLine="hair" lineColor="black"/>
            <line id="7" firstPoint="4" secondPoint="3" typeLine="hair" lineColor="black"/>
            <line id="8" firstPoint="3" secondPoint="1" typeLine="hair" lineColor="black"/>
        </calculation>
        <modeling>
            <point id="100" idObject="1" inUse="true" type="modeling"/>
            <point id="101" idObject="2" inUse="true" type="modeling"/>
            <point id="102" idObject="4" inUse="true" type="modeling"/>
            <point id="103" idObject="3" inUse="true" type="modeling"/>
        </modeling>
        <details>
            <detail id="200" name="Panel" mx="0" my="0" version="2" inLayout="true" united="false" width="10" forbidFlipping="false">
                <data letter="" visible="true" fontSize="14" mx="0" my="0" width="60" height="30" rotation="0"/>
                <patternInfo visible="true" fontSize="14" mx="0" my="0" width="60" height="30" rotation="0"/>
                <grainline visible="false" mx="0" my="0" length="80" rotation="90"/>
                <nodes>
                    <node idObject="100" type="NodePoint"/>
                    <node idObject="101" type="NodePoint"/>
                    <node idObject="102" type="NodePoint"/>
                    <node idObject="103" type="NodePoint"/>
                </nodes>
            </detail>
        </details>
    </draw>
</pattern>`;

    // Validar
    const validation = validateXML(valXML);
    if (!validation.valid) {
        console.error(`[SEAMLY_ENGINE] ❌ Validación XML del .val falló:`);
        validation.errors.forEach(e => console.error(`  → ${e}`));
    }

    fs.writeFileSync(outputPath, valXML, 'utf8');
    console.log(`[ENGINE] SUCCESS: .val generado con coordenadas numéricas: A(0,0) B(${ancho},0) C(0,${-largo}) D(${ancho},${-largo})`);

    return outputPath;
}

// =============================================================================
// EJECUCIÓN DE SEAMLY2D CLI
// =============================================================================

/**
 * Ejecuta Seamly2D CLI para exportar SVG.
 * Genera dinámicamente el .val con valores numéricos inyectados.
 * 
 * @param {string} vitPath - Ruta al archivo .vit de medidas
 * @param {string} valPath - Ruta al archivo .val del patrón
 * @param {string} outDirPath - Directorio de salida para el SVG
 * @param {Object} params - Parámetros sanitizados (para regenerar el .val dinámicamente)
 * @returns {Promise<string>}
 */
function generarSVG(vitPath, valPath, outDirPath, params) {
    const { exec } = require('child_process');

    // PASO 1: Regenerar el .val dinámicamente con valores numéricos literales
    if (params) {
        const cleanParams = cleanAIOutput(params);
        const vitFileName = path.basename(vitPath);
        generarArchivoVAL(cleanParams, vitFileName, valPath);
    }

    // PASO 2: Dump de debug — mostrar ambos archivos antes de ejecutar
    try {
        const vitContent = fs.readFileSync(vitPath, 'utf8');
        const valContent = fs.readFileSync(valPath, 'utf8');
        console.log(`\n[ENGINE] DEBUG: ═══════════════ .vit ═══════════════`);
        console.log(vitContent);
        console.log(`[ENGINE] DEBUG: ═══════════════ .val ═══════════════`);
        console.log(valContent);
        console.log(`[ENGINE] DEBUG: ════════════════════════════════════\n`);
    } catch (e) {
        console.warn(`[ENGINE] WARNING: No se pudieron leer archivos para debug: ${e.message}`);
    }

    return new Promise((resolve, reject) => {
        // Encontrar ejecutable de Seamly2D
        const seamlyPaths = [
            '/usr/bin/seamly2d',
            '/home/fabio/Downloads/seamly2d',
            'seamly2d'
        ];

        let seamlyCmd = '/home/fabio/Downloads/seamly2d';
        for (const p of seamlyPaths) {
            if (fs.existsSync(p)) {
                seamlyCmd = p;
                break;
            }
        }

        const baseName = path.basename(valPath, '.val');
        const command = `"${seamlyCmd}" -m "${vitPath}" -d "${outDirPath}" -f svg -b "${baseName}" "${valPath}"`;

        console.log(`[ENGINE] STATUS: Ejecutando CLI: ${command}`);

        exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
            if (stdout) console.log(`[ENGINE] STDOUT: ${stdout}`);
            if (stderr) console.log(`[ENGINE] STDERR: ${stderr}`);

            if (error) {
                return reject(new Error(`[ENGINE] CRITICAL: Error Seamly2D CLI: ${error.message}\n${stderr}`));
            }
            console.log(`[ENGINE] SUCCESS: SVG exportado exitosamente en: ${outDirPath}`);
            resolve(outDirPath);
        });
    });
}

module.exports = {
    generarArchivoVIT,
    generarArchivoVAL,
    generarSVG,
    // Utilidades exportadas para testing
    sanitizeValue,
    sanitizeMeasurementName,
    cleanAIOutput,
    validateXML
};
