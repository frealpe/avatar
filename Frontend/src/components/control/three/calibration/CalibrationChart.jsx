import React from 'react';
import LineChart from '../../../graphs/LineChart';

// Axis color palette per signal key
const COLORS = {
    gx: '#3b82f6', gy: '#10b981', gz: '#ef4444',
    ax: '#f59e0b', ay: '#8b5cf6', az: '#06b6d4',
    mx: '#ec4899', my: '#84cc16', mz: '#f97316',
};

const GYRO_AXES = ['gx', 'gy', 'gz'];
const ACCEL_AXES = ['ax', 'ay', 'az'];
const MAG_AXES = ['mx', 'my', 'mz'];

/**
 * CalibrationChart — HOC wrapping LineChart.
 *
 * Props:
 *   data       Object { gx, gy, gz, ax, ay, az, mx, my, mz } — rolling buffers
 *   sensorType 'gyro' | 'accel' | 'mag'
 *   axisIndex  0 | 1 | 2 | null  (null = show all 3 axes of that sensor)
 *   light      boolean
 */
const CalibrationChart = ({ data, sensorType, axisIndex = null, light = true }) => {
    let allKeys = GYRO_AXES;
    if (sensorType === 'accel') allKeys = ACCEL_AXES;
    if (sensorType === 'mag') allKeys = MAG_AXES;

    const targetKeys = axisIndex !== null ? [allKeys[axisIndex]] : allKeys;

    const series = targetKeys.map(key => ({
        key,
        label: key.toUpperCase(),
        color: COLORS[key] || '#888',
        values: Array.isArray(data[key]) ? data[key] : [],
    }));

    return (
        <LineChart
            series={series}
            height={axisIndex !== null ? 170 : 130}
            light={light}
        />
    );
};

export default CalibrationChart;
