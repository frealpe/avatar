// Helper functions to map physical measurements to 3D model properties (scale or blendshapes)

/**
 * Maps real body measurements to blendshape/morph target influences (0 to 1).
 * Note: These mapping functions are simplified placeholders.
 * Real mapping depends entirely on how the specific 3D model was rigged and exported
 * (e.g., SMPL betas vs Blender shape keys).
 *
 * @param {Object} bodyParams { height, chest, waist, hips }
 * @returns {Object} Values typically ranging from 0 to 1 for shape keys
 */
export const mapToBlendshapes = (bodyParams) => {
    // Example: normalize based on expected min/max values
    const normalize = (val, min, max) => Math.max(0, Math.min(1, (val - min) / (max - min)));

    return {
        // e.g. "Chest_Size" shape key mapped from 70cm to 130cm
        chestInfluence: normalize(bodyParams.chest, 70, 130),

        // e.g. "Waist_Size" shape key mapped from 50cm to 110cm
        waistInfluence: normalize(bodyParams.waist, 50, 110),

        // e.g. "Hips_Size" shape key mapped from 70cm to 130cm
        hipsInfluence: normalize(bodyParams.hips, 70, 130),

        // Height often controls bone scale rather than a single blendshape,
        // but here is a simple mapping for a height morph target
        heightInfluence: normalize(bodyParams.height, 140, 210)
    };
};

/**
 * Maps real body measurements to 3D scale vectors (X, Y, Z).
 * This is useful if the model lacks blendshapes and you rely on non-uniform scaling.
 *
 * @param {Object} bodyParams { height, chest, waist, hips }
 * @param {number} baseHeight The baseline height of the model in cm (e.g., 170)
 * @param {number} baseGirth The baseline girth of the model in cm (e.g., 90)
 * @returns {Object} scale object { x, y, z }
 */
export const mapToScale = (bodyParams, baseHeight = 170, baseGirth = 90) => {
    // Height mostly affects Y axis
    const y = bodyParams.height / baseHeight;

    // Girth (Chest/Waist/Hips average or just chest for a simple proxy) affects X and Z axes
    // In a sophisticated rig, you'd scale specific bone groups (spine, pelvis, ribcage).
    // Here we apply a global scale based on an average girth.
    const averageGirth = (bodyParams.chest + bodyParams.waist + bodyParams.hips) / 3;
    const xz = averageGirth / baseGirth;

    return { x: xz, y: y, z: xz };
};
