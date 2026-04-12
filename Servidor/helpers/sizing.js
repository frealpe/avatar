/**
 * Sistema de Tallaje Colombiano (XS, S, M, L, XL, XXL)
 * Basado en medidas corporales (Pecho, Cintura, Cadera)
 */

const RANGOS_MUJER = [
    { label: 'XS', chest: [76, 81], waist: [61, 66], hips: [84, 89] },
    { label: 'S',  chest: [81, 89], waist: [66, 71], hips: [89, 97] },
    { label: 'M',  chest: [89, 94], waist: [71, 79], hips: [97, 102] },
    { label: 'L',  chest: [94, 102], waist: [79, 86], hips: [102, 109] },
    { label: 'XL', chest: [102, 112], waist: [86, 97], hips: [109, 119] },
    { label: 'XXL', chest: [112, 122], waist: [97, 108], hips: [119, 129] }
];

const RANGOS_HOMBRE = [
    { label: 'XS', chest: [84, 89], waist: [69, 74] },
    { label: 'S',  chest: [89, 97], waist: [74, 79] },
    { label: 'M',  chest: [97, 104], waist: [79, 86] },
    { label: 'L',  chest: [104, 112], waist: [86, 94] },
    { label: 'XL', chest: [112, 122], waist: [94, 104] },
    { label: 'XXL', chest: [122, 132], waist: [104, 114] }
];

const calcularTalla = (gender, chest, waist, hips) => {
    const rangos = (gender === 'female') ? RANGOS_MUJER : RANGOS_HOMBRE;
    
    // Buscar la talla que contenga al menos uno de los parámetros prioritarios (Pecho/Cintura)
    // O retornar la talla donde el usuario caiga en la mayoría de sus medidas.
    
    let mejorTalla = 'M'; // Default
    
    for (const r of rangos) {
        const inChest = chest >= r.chest[0] && chest <= r.chest[1];
        const inWaist = waist >= r.waist[0] && waist <= r.waist[1];
        const inHips = hips ? (hips >= r.hips[0] && hips <= r.hips[1]) : true;
        
        // Si calza perfectamente
        if (inChest && inWaist && inHips) {
            return {
                talla_letra: r.label,
                talla_numero: null // Opcional
            };
        }
        
        // Si el pecho calza (medida más crítica para partes superiores)
        if (inChest) mejorTalla = r.label;
    }
    
    // Si es muy pequeño
    if (chest < rangos[0].chest[0]) return { talla_letra: 'XS', talla_numero: null };
    // Si es muy grande
    if (chest > rangos[rangos.length - 1].chest[1]) return { talla_letra: 'XXL', talla_numero: null };

    return {
        talla_letra: mejorTalla,
        talla_numero: null
    };
};

module.exports = {
    calcularTalla,
    RANGOS_MUJER,
    RANGOS_HOMBRE
};
