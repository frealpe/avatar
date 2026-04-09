/**
 * @fileoverview Garment Analyzer - Motor de Digitalización Proporcional de Prendas
 * 
 * Implementa un pipeline geométrico completo para digitalizar prendas SIN necesidad
 * de escala real. Usa proporciones y normalización a talla M comercial.
 * 
 * Pipeline:
 * Imagen → Análisis de Descripción → Proporciones → Normalización M → Validación → Medidas Finales
 */

'use strict';

// =============================================================================
// BASE COMERCIAL TALLA M (en cm)
// Referencia: estándares industriales ISO 6Size + ASTM D5585
// =============================================================================
const TALLA_M_BASE = {
    shirt_length: 70,    // Largo total cuerpo
    chest_half: 52,      // Mitad del pecho (para patronaje plano)
    shoulder: 44,        // Ancho de hombros
    sleeve_long: 62,     // Manga larga
    sleeve_short: 22,    // Manga corta
    neck_circumference: 39, // Contorno de cuello
    neck_depth_v: 12,    // Profundidad cuello V
    neck_depth_round: 8, // Profundidad cuello redondo
    waist_ease: 4,       // Holgura de talle
    hem_width: 54,       // Ancho bajo / cadera
};

// Factores de escala para diferentes tipos de ajuste (fit)
const FIT_FACTORS = {
    slim: 0.90,
    entallado: 0.90,
    regular: 1.00,
    holgado: 1.15,
    oversized: 1.25,
    default: 1.00
};

// Rangos de validación por medida (min, max en cm)
const VALIDATION_RANGES = {
    neck_depth_cm: { min: 4, max: 18 },
    sleeve_length_cm: { min: 10, max: 70 },
    shoulder_width_cm: { min: 30, max: 60 },
    waist_ease_cm: { min: 0, max: 20 },
    chest_width_cm: { min: 40, max: 70 },
    shirt_length_cm: { min: 45, max: 90 },
    ancho_pecho: { min: 40, max: 70 },
    largo_total: { min: 45, max: 90 },
    largo_manga: { min: 10, max: 70 },
};

// =============================================================================
// 1. DETECCIÓN DE KEYPOINTS (desde descripción textual de LLaVA)
//    Extrae características clave de la prenda para calcular proporciones
// =============================================================================

/**
 * Detecta keypoints y características clave desde la descripción de LLaVA.
 * @param {string} descripcion - Descripción textual del modelo de visión
 * @returns {Object} Keypoints normalizados (como ratios 0.0-1.0)
 */
function detectKeypoints(descripcion) {
    const desc = descripcion.toLowerCase();

    // --- Tipo de manga ---
    let sleeve_ratio = 0.31; // default: manga corta (22cm / 70cm)
    if (desc.includes('manga larga') || desc.includes('long sleeve') || desc.includes('larga')) {
        sleeve_ratio = 0.89; // 62cm / 70cm
    } else if (desc.includes('3/4') || desc.includes('tres cuartos')) {
        sleeve_ratio = 0.57; // 40cm / 70cm
    } else if (desc.includes('sin manga') || desc.includes('sleeveless') || desc.includes('sisa')) {
        sleeve_ratio = 0.0;
    } else if (desc.includes('raglán') || desc.includes('raglan')) {
        sleeve_ratio = 0.50;
    }

    // --- Tipo de cuello ---
    let neck_ratio = 0.11; // default: cuello redondo (8cm / 70cm)
    if (desc.includes('v-neck') || desc.includes('cuello en v') || desc.includes('cuello v') || desc.includes('escote en v')) {
        neck_ratio = 0.17; // V neck: 12cm / 70cm
    } else if (desc.includes('crew') || desc.includes('cuello caja') || desc.includes('tortuga') || desc.includes('buzo')) {
        neck_ratio = 0.06; // crew: 4cm
    } else if (desc.includes('polo') || desc.includes('cuello sport')) {
        neck_ratio = 0.09;
    }

    // --- Ancho relativo del pecho ---
    let width_ratio = 0.74; // default: 52cm / 70cm
    if (desc.includes('ajustada') || desc.includes('slim') || desc.includes('entallado')) {
        width_ratio = 0.67; // 47cm / 70cm
    } else if (desc.includes('holgada') || desc.includes('oversized') || desc.includes('suelta')) {
        width_ratio = 0.89; // 62cm / 70cm
    }

    // --- Largo total ---
    let length_ratio = 1.0; // default: 70cm (largo camiseta M)
    if (desc.includes('crop') || desc.includes('corta') || desc.includes('ombligo')) {
        length_ratio = 0.71; // 50cm
    } else if (desc.includes('vestido') || desc.includes('dress') || desc.includes('larga') || desc.includes('midi') || desc.includes('maxi')) {
        length_ratio = 1.57; // 110cm
    } else if (desc.includes('túnica') || desc.includes('tunique')) {
        length_ratio = 1.28; // 90cm
    }

    // --- Ancho de hombros ---
    let shoulder_ratio = 0.63; // default: 44cm / 70cm
    if (desc.includes('hombros anchos') || desc.includes('dropped shoulder') || desc.includes('caído')) {
        shoulder_ratio = 0.71;
    } else if (desc.includes('hombros estrechos') || desc.includes('narrow')) {
        shoulder_ratio = 0.54;
    }

    // --- Tipo de ajuste ---
    let fit_type = 'regular';
    if (desc.includes('slim') || desc.includes('ajustad') || desc.includes('entallad') || desc.includes('ceñid')) {
        fit_type = 'slim';
    } else if (desc.includes('oversized') || desc.includes('oversize') || desc.includes('holgad') || desc.includes('suelto')) {
        fit_type = 'oversized';
    }

    console.log(`[GARMENT ANALYZER] Keypoints detectados: sleeve_ratio=${sleeve_ratio.toFixed(2)}, neck_ratio=${neck_ratio.toFixed(2)}, fit=${fit_type}`);

    return {
        sleeve_ratio,
        neck_ratio,
        width_ratio,
        shoulder_ratio,
        length_ratio,
        fit_type
    };
}

// =============================================================================
// 2. CÁLCULO DE PROPORCIONES (output: valores normalizados)
// =============================================================================

/**
 * Calcula proporciones absolutas a partir de keypoints.
 * @param {Object} keypoints - Ratios detectados desde la descripción
 * @returns {Object} Proporciones calculadas
 */
function computeProportions(keypoints) {
    return {
        width_to_length: keypoints.width_ratio,
        sleeve_to_length: keypoints.sleeve_ratio,
        neck_to_length: keypoints.neck_ratio,
        shoulder_to_length: keypoints.shoulder_ratio,
        total_length: keypoints.length_ratio,
        fit_type: keypoints.fit_type
    };
}

// =============================================================================
// 3. NORMALIZACIÓN A TALLA M (CRÍTICO)
// =============================================================================

/**
 * Normaliza las proporciones a medidas reales basadas en la talla M comercial.
 * @param {Object} proportions - Ratios calculados de la prenda
 * @returns {Object} Medidas en cm compatibles con SeamlyMe y pattern_engine.js
 */
function normalizeToSizeM(proportions) {
    const base_length = TALLA_M_BASE.shirt_length;
    const fit_factor = FIT_FACTORS[proportions.fit_type] || FIT_FACTORS.default;

    const shirt_length_cm = +(base_length * proportions.total_length).toFixed(1);
    const chest_width_cm = +(base_length * proportions.width_to_length * fit_factor).toFixed(1);
    const sleeve_length_cm = proportions.sleeve_to_length > 0 
        ? +(base_length * proportions.sleeve_to_length).toFixed(1)
        : 0;
    const neck_depth_cm = +(base_length * proportions.neck_to_length).toFixed(1);
    const shoulder_width_cm = +(base_length * proportions.shoulder_to_length).toFixed(1);

    console.log(`[GARMENT ANALYZER] Normalización talla M (fit: ${proportions.fit_type}, factor: ${fit_factor}):`);
    console.log(`  largo=${shirt_length_cm}cm, pecho=${chest_width_cm}cm, manga=${sleeve_length_cm}cm, cuello=${neck_depth_cm}cm`);

    return {
        // Medidas numéricas para pattern_engine.js / seamly_engine.js
        // NOTA: No incluir campos de texto como 'fit' — el .vit solo acepta valores numéricos
        neck_depth_cm,
        sleeve_length_cm,
        shoulder_width_cm,
        waist_ease_cm: TALLA_M_BASE.waist_ease,
        // Medidas adicionales para Seamly2D (todas numéricas)
        ancho_pecho: chest_width_cm,
        largo_total: shirt_length_cm,
        largo_manga: sleeve_length_cm,
    };
}

// =============================================================================
// 4. VALIDACIÓN DE MEDIDAS
// =============================================================================

/**
 * Valida las medidas y corrige valores fuera de rango automáticamente.
 * @param {Object} measurements - Medidas calculadas en cm
 * @returns {Object} Medidas validadas y corregidas
 */
function validateMeasurements(measurements) {
    const validated = { ...measurements };

    for (const [key, value] of Object.entries(validated)) {
        const range = VALIDATION_RANGES[key];
        if (!range || typeof value !== 'number') continue;

        if (value < range.min) {
            console.warn(`[GARMENT ANALYZER] ⚠️ ${key}=${value} < min(${range.min}). Corrigiendo a ${range.min}.`);
            validated[key] = range.min;
        } else if (value > range.max) {
            console.warn(`[GARMENT ANALYZER] ⚠️ ${key}=${value} > max(${range.max}). Corrigiendo a ${range.max}.`);
            validated[key] = range.max;
        }
    }

    return validated;
}

// =============================================================================
// 5. PIPELINE PRINCIPAL - ANÁLISIS DE PRENDA
// =============================================================================

/**
 * Pipeline completo: descripción → medidas normalizadas y validadas.
 * NO usa cm directamente desde la imagen, siempre usa proporciones.
 * 
 * @param {string} descripcion - Descripción textual de LLaVA
 * @returns {Object} Medidas finales listas para patron_engine.js
 */
function analyzeGarmentFromDescription(descripcion) {
    console.log(`[GARMENT ANALYZER] 🔬 Iniciando análisis proporcional...`);

    // 1. Detectar keypoints y características
    const keypoints = detectKeypoints(descripcion);

    // 2. Calcular proporciones
    const proportions = computeProportions(keypoints);

    // 3. Normalizar a talla M
    const rawMeasurements = normalizeToSizeM(proportions);

    // 4. Validar y corregir
    const finalMeasurements = validateMeasurements(rawMeasurements);

    console.log(`[GARMENT ANALYZER] ✅ Medidas finales: ${JSON.stringify(finalMeasurements)}`);

    return finalMeasurements;
}


module.exports = {
    analyzeGarmentFromDescription,
    detectKeypoints,
    computeProportions,
    normalizeToSizeM,
    validateMeasurements,
    TALLA_M_BASE,
    FIT_FACTORS,
};
