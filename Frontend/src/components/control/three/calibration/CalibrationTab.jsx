import React from 'react';
import { CButton, CFormSelect, CSpinner } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilWifiSignal4, cilX, cilMediaPlay, cilMediaStop } from '@coreui/icons';
import CircleProgress from './CircleProgress';
import { StillAnimation, Rotate6Animation, Figure8Animation } from './CalibrationAnimations';

const normalizeMac = (m) => m ? m.replace(/:/g, '').toLowerCase() : '';

const CalibrationTab = ({
    selectedSlave,
    onSlaveChange,
    calibActive,
    slaves,
    selectedSensor,
    setSelectedSensor,
    sensorOptions,
    sensorDef,
    currentStep,
    activeSteps,
    calibStats,
    stepToast,
    chartData,
    handleCancel,
    allDone,
    calibDone,
    handleStart,
    t,
    stepDefs,
    rawStreamActive,
    handleToggleRawStream,
    testActive,
    setTestActive,
    rawSignals
}) => {
    return (
        <>
            {/* Drone selector */}
            <div className="mb-3">
                <label className="text-secondary small d-block mb-1">Drone Slave</label>
                <CFormSelect value={selectedSlave} onChange={onSlaveChange} disabled={calibActive}
                    className="bg-transparent text-white border-secondary small">
                    <option value="">-- Selecciona un Drone --</option>
                    {slaves.map(s => {
                        const m = normalizeMac(s.mac_address || s.mac);
                        return <option key={m} value={m}>{s.name || m}</option>;
                    })}
                </CFormSelect>
                {slaves.length === 0 && <small className="text-muted d-block mt-1">No hay Slaves registrados.</small>}
            </div>

            {/* Sensor selector */}
            <div className="mb-3">
                <label className="text-secondary small d-block mb-1">Sensor a calibrar</label>
                <div className="d-flex flex-wrap gap-1">
                    {sensorOptions.map(s => (
                        <button key={s.id} onClick={() => !calibActive && setSelectedSensor(s.id)}
                            style={{
                                background: selectedSensor === s.id ? 'rgba(32,201,151,0.18)' : 'rgba(255,255,255,0.04)',
                                border: selectedSensor === s.id ? '1px solid #20c99788' : '1px solid rgba(255,255,255,0.1)',
                                color: selectedSensor === s.id ? '#20c997' : '#94a3b8',
                                borderRadius: '8px', padding: '4px 10px',
                                cursor: calibActive ? 'not-allowed' : 'pointer',
                                fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.18s',
                                opacity: calibActive ? 0.5 : 1,
                            }}>
                            {s.emoji} {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Pure Data Mode Toggle */}
            <div className="mb-3 d-flex align-items-center justify-content-between p-2 rounded"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="d-flex flex-column">
                    <span className="fw-bold small text-white">Modo Datos Puros</span>
                    <small className="text-secondary" style={{ fontSize: '0.65rem' }}>
                        Solicita IMU RAW (ideal para calibración)
                    </small>
                </div>
                <div className="form-check form-switch mb-0">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="rawStreamSwitch"
                        checked={rawStreamActive}
                        onChange={handleToggleRawStream}
                        disabled={calibActive || !selectedSlave}
                        style={{ width: '2.5rem', height: '1.25rem', cursor: (calibActive || !selectedSlave) ? 'not-allowed' : 'pointer' }}
                    />
                </div>
            </div>


            {/* ── ACTIVE CALIBRATION UI ───────────────────────────────── */}
            {calibActive && currentStep ? (<>

                {/* Phone-style animation */}
                <div className="rounded mb-3 d-flex flex-column align-items-center justify-content-center"
                    style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${currentStep.color}44`, minHeight: '160px', padding: '16px' }}>
                    <svg width="180" height="90" style={{ overflow: 'visible', marginBottom: 8 }}>
                        <g transform="translate(90,45)">
                            {currentStep.animation === 'still' && <StillAnimation />}
                            {currentStep.animation === 'rotate6' && <Rotate6Animation t={t} />}
                            {currentStep.animation === 'figure8' && <Figure8Animation t={t} />}
                        </g>
                    </svg>
                    <div className="fw-bold mb-1" style={{ color: currentStep.color, fontSize: '0.85rem' }}>
                        {currentStep.icon} {currentStep.label} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>← Hazlo ahora</span>
                    </div>
                    <div className="text-muted text-center" style={{ fontSize: '0.75rem', maxWidth: '260px' }}>
                        {currentStep.instruction}
                    </div>
                </div>

                {/* Toast */}
                {stepToast && (
                    <div className="rounded p-2 mb-3 d-flex align-items-center gap-2 small"
                        style={{ background: 'rgba(32,201,151,0.12)', border: '1px solid #20c99766' }}>
                        <span style={{ fontSize: '1.2em' }}>{stepToast.emoji}</span>
                        <strong className="text-success">{stepToast.msg}</strong>
                    </div>
                )}

                {/* Progress rings */}
                <div className="d-flex justify-content-around mb-3">
                    {activeSteps.map(s => (
                        <CircleProgress key={s.id} value={calibStats[s.key]} color={s.color}
                            label={s.label} icon={s.icon} done={calibStats[s.key] >= 3} />
                    ))}
                    {selectedSensor === 'full' && (
                        <CircleProgress value={calibStats.cs} color="#a78bfa"
                            label="Sistema" icon="🔧" done={calibStats.cs >= 3} />
                    )}
                </div>

                <CButton color="danger" variant="outline" className="w-100 small" onClick={handleCancel}>
                    <CIcon icon={cilX} className="me-1" /> Cancelar
                </CButton>

            </>) : calibActive && allDone ? (
                <div className="text-center py-3">
                    <CSpinner color="success" size="sm" className="me-2" />
                    <span className="text-success small">Todos los sensores listos, enviando reporte...</span>
                </div>
            ) : calibDone ? (
                <div className="rounded p-3 text-center mb-3" style={{ background: 'rgba(32,201,151,0.08)', border: '1px solid #20c99744' }}>
                    <div style={{ fontSize: '2.5rem' }}>✅</div>
                    <div className="fw-bold text-success mb-1">¡Calibración Completa!</div>
                    <small className="text-muted d-block mb-2">
                        Offsets guardados en el drone y en la base de datos.
                    </small>
                    {calibDone.durationMs > 0 && (
                        <small className="text-secondary">Duración: {Math.round(calibDone.durationMs / 1000)}s</small>
                    )}
                    <div className="font-monospace text-secondary mt-2" style={{ fontSize: '0.65rem', wordBreak: 'break-all' }}>
                        [{calibDone.offsets?.join(', ')}]
                    </div>
                    <CButton color="info" variant="outline" size="sm" className="mt-2"
                        onClick={() => handleStart(null)}> {/* Note: handleStart(null) just to reset calibDone in parent */}
                        Nueva calibración
                    </CButton>
                </div>
            ) : testActive ? (
                <CButton color="danger" variant="outline" className="w-100"
                    onClick={() => { handleCancel(); setTestActive(false); }} style={{ height: 48 }}>
                    <CIcon icon={cilMediaStop} className="me-2" />
                    Finalizar Prueba y Calibrar
                </CButton>
            ) : (
                <CButton color="success" variant="outline" className="w-100" disabled={!selectedSlave}
                    onClick={() => { handleStart(); setTestActive(true); }} style={{ height: 48 }}>
                    <CIcon icon={cilMediaPlay} className="me-2" />
                    Inicio de la prueba {sensorDef.emoji}
                </CButton>
            )}
        </>
    );
};

export default CalibrationTab;
