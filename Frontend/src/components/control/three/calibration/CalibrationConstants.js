export const SENSOR_OPTIONS = [
    { id: 'full', label: 'Calibración Completa', emoji: '🎯', steps: ['gyro', 'accel', 'mag'] },
    { id: 'gyro', label: 'Solo Giroscopio', emoji: '📐', steps: ['gyro'] },
    { id: 'accel', label: 'Solo Acelerómetro', emoji: '🔄', steps: ['accel'] },
    { id: 'mag', label: 'Solo Magnetómetro', emoji: '🧭', steps: ['mag'] },
];

export const STEP_DEFS = {
    gyro: { label: 'Giroscopio', color: '#20c997', key: 'cg', instruction: 'Coloca el drone quieto y perfectamente nivelado sobre una superficie plana.', animation: 'still', icon: '📐' },
    accel: { label: 'Acelerómetro', color: '#0dcaf0', key: 'ca', instruction: 'Rota el drone lentamente en 6 posiciones: plano, frente arriba, atrás arriba, izquierda, derecha, al revés.', animation: 'rotate6', icon: '🔄' },
    mag: { label: 'Magnetómetro', color: '#fd7e14', key: 'cm', instruction: 'Mueve el drone lentamente en el aire dibujando una figura de 8.', animation: 'figure8', icon: '🧭' },
};
