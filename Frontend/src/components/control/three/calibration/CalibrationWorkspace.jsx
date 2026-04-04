import React from 'react';
import CalibrationChart from './CalibrationChart';
import { SENSOR_OPTIONS } from './CalibrationConstants';

const CalibrationWorkspace = ({ data, sensorType, selectedSlaveName }) => {
    const sensorDef = SENSOR_OPTIONS.find(s => s.id === sensorType) || SENSOR_OPTIONS[0];

    const axes = [
        { name: 'X', color: '#3b82f6', index: 0 },
        { name: 'Y', color: '#10b981', index: 1 },
        { name: 'Z', color: '#ef4444', index: 2 }
    ];

    return (
        <div className="w-100 h-100 p-3 d-flex flex-column" style={{
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)',
            overflow: 'hidden'
        }}>
            <div className="mb-3 pb-2 border-bottom d-flex justify-content-between align-items-center">
                <div>
                    <h5 className="text-dark mb-0 fw-bold">Dashboard de Calibración: {sensorDef.label} {sensorDef.emoji}</h5>
                    <div className="d-flex align-items-center gap-2">
                        <small className="text-muted">
                            Monitoreo en tiempo real para <strong>{selectedSlaveName || 'Drone'}</strong>
                        </small>
                        {/* DEBUG PILL */}
                        <span className="badge bg-secondary rounded-pill" style={{ fontSize: '0.6rem' }}>
                            Buffer: {data.gx?.length || 0} pts
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-grow-1 overflow-auto">
                <div className="row g-3 h-100">
                    {/* Visualización de los 3 ejes del sensor activo */}
                    {axes.map((axis) => (
                        <div key={axis.name} className="col-6">
                            <div className="p-3 bg-white rounded border shadow-sm h-100 d-flex flex-column">
                                <div className="d-flex align-items-center mb-2 gap-2">
                                    <span style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: axis.color
                                    }}></span>
                                    <h6 className="mb-0 text-dark fw-bold small">Eje {axis.name} - {sensorDef.label}</h6>
                                </div>
                                <div className="flex-grow-1">
                                    <CalibrationChart
                                        data={data}
                                        sensorType={sensorType === 'full' ? 'gyro' : sensorType}
                                        axisIndex={axis.index}
                                        light={true}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Quadrant 4: Accelerometer View if full, otherwise Combined */}
                    <div className="col-6">
                        <div className="p-3 bg-white rounded border shadow-sm h-100 d-flex flex-column" style={{ borderLeft: '3px solid #6366f1' }}>
                            <div className="d-flex align-items-center mb-2 gap-2">
                                <span className="small">📊</span>
                                <h6 className="mb-0 text-dark fw-bold small">
                                    {sensorType === 'full' ? 'Acelerómetro (Vista Rápida)' : 'Vista Combinada (XYZ)'}
                                </h6>
                            </div>
                            <div className="flex-grow-1">
                                <CalibrationChart
                                    data={data}
                                    sensorType={sensorType === 'full' ? 'accel' : sensorType}
                                    axisIndex={sensorType === 'full' ? 2 : null} // Muestra Z de accel si es full para ver vibración
                                    light={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .vega-chart-container {
                    min-height: 200px;
                }
                .vega-chart-container canvas {
                    filter: saturate(1.2);
                }
            `}</style>
        </div>
    );
};

export default CalibrationWorkspace;
