import React, { useState } from 'react';
import { CButton, CRow, CCol, CFormCheck, CBadge, CFormInput } from '@coreui/react-pro';
import CIcon from '@coreui/icons-react';
import { cilMediaPlay, cilMediaStop, cilSave, cilReload, cilChevronBottom, cilChevronTop } from '@coreui/icons';
import RouteOffsetControls from '../mission/RouteOffsetControls';

// Shared label style for dark panel
const labelStyle = { fontSize: '0.65rem', color: '#adb5bd' };
const sectionLabel = { fontSize: '0.65rem', color: '#6ea8fe', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' };

// Reusable collapsible header
const CollapsibleHeader = ({ label, open, onToggle }) => (
    <div
        className="d-flex align-items-center justify-content-between mb-1 user-select-none"
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
    >
        <label style={{ ...sectionLabel, cursor: 'pointer', marginBottom: 0 }}>{label}</label>
        <CIcon icon={open ? cilChevronTop : cilChevronBottom} size="sm" style={{ color: '#6ea8fe', flexShrink: 0 }} />
    </div>
);

/**
 * StationPanel — Estación de Control
 * Presentational: receives all state + callbacks from ThreeTrajectoryScene.
 */
const StationPanel = ({
    // Trajectory type
    trajectoryType, setTrajectoryType,
    gridHeight, onGridHeightChange,
    radius, setRadius,
    zAmplitude, setZAmplitude,
    petals, setPetals,
    phaseDist, setPhaseDist,
    numPoints, setNumPoints,
    // Simulation
    isSimulating, setIsSimulating,
    simSpeed, setSimSpeed,
    // Grid
    gridSize, setGridSize,
    gridDivisions, setGridDivisions,
    // Slaves
    devices, loadingDevices,
    selectedSlaveIds, onToggleSlave,
    droneAltitudes, onDroneAltitudeChange,
    droneOscillation, onToggleDroneOscillation,
    // Save
    newTrajectoryName, setNewTrajectoryName,
    onSaveTrajectory,
    onResetWaypoints,
    relativeSpread, setRelativeSpread,
    oppositeStart, setOppositeStart,
    // Route Offset Controls
    globalControl, setGlobalControl,
    handleRouteOffset,
    selectedSlaveIds: selectedSlaveIdsProp = [],
}) => {
    const [showSlaves, setShowSlaves] = useState(false);
    const [showSave, setShowSave] = useState(false);

    return (
        <div style={{ color: '#dee2e6' }}>
            {/* ── Route generation ───────────────────────────────── */}
            <div className="mb-2 pt-1">
                <label style={sectionLabel} className="d-block mb-1">
                    Generación de Rutas
                </label>

                <CRow className="g-2 mb-2">
                    <CCol xs={12}>
                        <select
                            className="form-select form-select-sm border-info fw-bold shadow-sm"
                            style={{ backgroundColor: 'rgba(51,153,255,0.12)', color: '#0dcaf0' }}
                            value={trajectoryType}
                            onChange={e => setTrajectoryType(e.target.value)}
                        >
                            <option value="circular" className="text-dark bg-light">Circular (Adaptive Swarm)</option>
                            <option value="flower" className="text-dark bg-light">Flor (Adaptive Swarm)</option>
                            <option value="spiral" className="text-dark bg-light">Espiral Cónica (Cono Invertido)</option>
                        </select>
                    </CCol>
                </CRow>

                <CRow className="g-2 mb-2">
                    <CCol xs={12}>
                        <div className="small mb-1" style={labelStyle}>Altitud Base (m) [1.0 – 10.0]</div>
                        <CFormInput
                            type="number" size="sm" step="0.1" min="1.0" max="10.0"
                            className="bg-transparent border-info text-info fw-bold"
                            value={gridHeight}
                            onChange={e => onGridHeightChange(Number(e.target.value))}
                        />
                    </CCol>
                </CRow>

                {(trajectoryType === 'circular' || trajectoryType === 'spiral') && (
                    <CRow className="g-2 mb-2">
                        <CCol xs={6}>
                            <div className="small mb-1" style={labelStyle}>Radio (m)</div>
                            <CFormInput type="number" size="sm" step="0.5" className="bg-transparent border-secondary"
                                value={radius} onChange={e => setRadius(Number(e.target.value))} />
                        </CCol>
                        <CCol xs={6}>
                            <div className="small mb-1" style={labelStyle}>
                                {trajectoryType === 'spiral' ? 'Altura Pico (m)' : 'Oscilación Z (m)'}
                            </div>
                            <CFormInput type="number" size="sm" step="0.5" className="bg-transparent border-secondary"
                                value={zAmplitude} onChange={e => setZAmplitude(Number(e.target.value))} />
                        </CCol>
                    </CRow>
                )}

                {trajectoryType === 'spiral' && (
                    <CRow className="g-2 mb-2">
                        <CCol xs={12}>
                            <div className="small mb-1" style={labelStyle}>Nº de Vueltas / Espirales</div>
                            <CFormInput type="number" size="sm" step="1" min="1" max="12" className="bg-transparent border-secondary"
                                value={petals} onChange={e => setPetals(Number(e.target.value))} />
                        </CCol>
                    </CRow>
                )}

                {trajectoryType === 'flower' && (
                    <CRow className="g-2 mb-2">
                        <CCol xs={6}>
                            <div className="small mb-1" style={labelStyle}>Amplitud (m)</div>
                            <CFormInput type="number" size="sm" step="0.5" className="bg-transparent border-secondary"
                                value={radius} onChange={e => setRadius(Number(e.target.value))} />
                        </CCol>
                        <CCol xs={6}>
                            <div className="small mb-1" style={labelStyle}>Nº Pétalos</div>
                            <CFormInput type="number" size="sm" step="1" min="1" max="12" className="bg-transparent border-secondary"
                                value={petals} onChange={e => setPetals(Number(e.target.value))} />
                        </CCol>
                    </CRow>
                )}

                <CRow className="g-2 mb-2">
                    <CCol xs={6}>
                        <div className="small mb-1" style={labelStyle}>
                            {trajectoryType === 'circular' ? 'Sep. Anillos (m)'
                                : trajectoryType === 'flower' ? 'Expansión Pétalos'
                                    : 'Separación Lateral (m)'}
                        </div>
                        <CFormInput type="number" size="sm" step="0.1" min="0" className="bg-transparent border-secondary"
                            value={phaseDist} onChange={e => setPhaseDist(Number(e.target.value))} />
                    </CCol>
                    <CCol xs={6}>
                        <div className="small mb-1" style={labelStyle}>Nº Puntos Curva</div>
                        <CFormInput
                            type="number" size="sm" step="4" min="8" max="360"
                            className="bg-transparent border-secondary"
                            value={numPoints}
                            onChange={e => setNumPoints(Math.max(8, Math.min(360, Number(e.target.value))))}
                        />
                    </CCol>
                </CRow>

                <CRow className="g-2 mb-1">
                    <CCol xs={12} className="mb-2">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <span style={labelStyle}>Separación Relativa ({relativeSpread.toFixed(1)}m)</span>
                            {relativeSpread > 0 && (
                                <CBadge color="info" shape="rounded-pill" style={{ fontSize: '0.55rem' }}>
                                    ACTIVO
                                </CBadge>
                            )}
                        </div>
                        <input type="range" className="form-range" min="0" max="10" step="0.5"
                            style={{ accentColor: '#0dcaf0' }}
                            value={relativeSpread}
                            onChange={e => setRelativeSpread(Number(e.target.value))} />
                    </CCol>
                    <CCol xs={12} className="d-flex align-items-center justify-content-between mb-2">
                        <span style={labelStyle}>Inicio Alternado (Opuesto)</span>
                        <CFormCheck
                            switch
                            id="opposite-check"
                            checked={oppositeStart}
                            onChange={() => setOppositeStart(!oppositeStart)}
                        />
                    </CCol>
                    <CCol xs={8}>
                        <div className="small mb-1" style={labelStyle}>Vel. Sim ({simSpeed}x)</div>
                        <input type="range" className="form-range" min="0.5" max="5" step="0.1"
                            style={{ accentColor: '#0dcaf0' }}
                            value={simSpeed} onChange={e => setSimSpeed(Number(e.target.value))} />
                    </CCol>
                    <CCol xs={4} className="d-flex align-items-end">
                        <CButton
                            color={isSimulating ? 'danger' : 'success'} size="sm" variant="outline"
                            className="w-100 d-flex align-items-center justify-content-center gap-1"
                            onClick={() => setIsSimulating(!isSimulating)}
                        >
                            <CIcon icon={isSimulating ? cilMediaStop : cilMediaPlay} />
                            {isSimulating ? 'Stop' : 'Play'}
                        </CButton>
                    </CCol>
                </CRow>
            </div>

            {/* ── Grid size ──────────────────────────────────────── */}
            <div className="mb-2 border-top border-secondary pt-2">
                <label style={sectionLabel} className="d-block mb-1">Tamaño de Cuadrícula</label>
                <CRow className="g-2 mt-1">
                    <CCol xs={6}>
                        <div className="small mb-1" style={labelStyle}>Tamaño</div>
                        <CFormInput type="number" size="sm" step="5" min="5" max="100"
                            className="bg-transparent border-secondary"
                            value={gridSize} onChange={e => setGridSize(Number(e.target.value))} />
                    </CCol>
                    <CCol xs={6}>
                        <div className="small mb-1" style={labelStyle}>Divisiones</div>
                        <CFormInput type="number" size="sm" step="5" min="5" max="100"
                            className="bg-transparent border-secondary"
                            value={gridDivisions} onChange={e => setGridDivisions(Number(e.target.value))} />
                    </CCol>
                </CRow>
            </div>

            {/* ── Slave list (collapsible) ───────────────────────── */}
            <div className="mb-2 border-top border-secondary pt-2">
                <CollapsibleHeader
                    label={`Slaves Disponibles${selectedSlaveIds.length > 0 ? ` (${selectedSlaveIds.length})` : ''}`}
                    open={showSlaves}
                    onToggle={() => setShowSlaves(v => !v)}
                />
                {showSlaves && (
                    <div className="overflow-auto border border-secondary rounded p-1 mt-1"
                        style={{ maxHeight: '220px', background: 'rgba(0,0,0,0.2)' }}>
                        {loadingDevices ? (
                            <div className="text-center p-2 small text-muted">Cargando...</div>
                        ) : devices.length === 0 ? (
                            <div className="text-center p-2 small text-warning">No hay Slaves</div>
                        ) : devices.filter(d => d.role !== 'master').map(d => (
                            <div key={d._id}
                                className="d-flex align-items-center justify-content-between mb-1 p-1 rounded hover-effect border-bottom border-secondary pb-2">
                                <div className="d-flex flex-column gap-1 w-100 pe-2">
                                    <div className="d-flex align-items-center gap-2 overflow-hidden justify-content-between w-100">
                                        <div className="d-flex gap-2">
                                            <CFormCheck
                                                id={`check-${d._id}`}
                                                checked={selectedSlaveIds.includes(d._id)}
                                                onChange={() => onToggleSlave(d._id)}
                                                className="m-0"
                                            />
                                            <div className="text-truncate small fw-bold"
                                                title={d.name || d.device_uid}
                                                style={{ fontSize: '0.75rem' }}>
                                                {d.name || d.device_uid}
                                            </div>
                                        </div>
                                        <CBadge color={d.is_active ? 'success' : 'secondary'}
                                            shape="rounded-pill" style={{ fontSize: '0.55rem' }}>
                                            {d.is_active ? 'ON' : 'OFF'}
                                        </CBadge>
                                    </div>

                                    <div className="ms-4 ps-1 d-flex flex-column gap-1">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span style={{ fontSize: '0.65rem', color: '#adb5bd' }}>Z Individual (m):</span>
                                            <input
                                                type="number" step="0.5"
                                                className="form-control form-control-sm bg-transparent border-secondary py-0"
                                                style={{ width: '60px', height: '20px', fontSize: '0.7rem', color: '#e9ecef' }}
                                                placeholder="Auto"
                                                value={droneAltitudes[d._id] !== undefined ? droneAltitudes[d._id] : ''}
                                                onChange={e => onDroneAltitudeChange(d._id, e.target.value)}
                                            />
                                        </div>
                                        {(trajectoryType === 'circular' || trajectoryType === 'flower') && (
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span style={{ fontSize: '0.65rem', color: '#adb5bd' }}>Oscilación Z:</span>
                                                <CFormCheck
                                                    id={`osc-${d._id}`}
                                                    checked={droneOscillation[d._id] !== false}
                                                    onChange={() => onToggleDroneOscillation(d._id)}
                                                    className="m-0"
                                                    style={{ transform: 'scale(0.8)' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Route Offset Controls (D-Pad) ─────────────────── */}
            <div className="border-top border-secondary pt-2 mb-2">
                <RouteOffsetControls
                    globalControl={globalControl}
                    setGlobalControl={setGlobalControl}
                    handleRouteOffset={handleRouteOffset}
                    selectedSlaveIds={selectedSlaveIdsProp}
                />
            </div>

            {/* ── Save trajectory (collapsible) ────────────── */}
            <div className="border-top border-secondary pt-2">
                <CollapsibleHeader
                    label="Guardar Trayectoria"
                    open={showSave}
                    onToggle={() => setShowSave(v => !v)}
                />
                {showSave && (
                    <div className="d-grid gap-2 mt-1">
                        <div>
                            <label style={sectionLabel} className="d-block mb-1">Nombre Trayectoria</label>
                            <CFormInput
                                size="sm" placeholder="Ej: Vuelo Circular A"
                                className="bg-transparent border-info"
                                value={newTrajectoryName}
                                onChange={e => setNewTrajectoryName(e.target.value)}
                            />
                        </div>
                        <CButton color="success" size="sm" variant="outline"
                            className="w-100 d-flex align-items-center justify-content-center gap-2"
                            onClick={onSaveTrajectory} disabled={!newTrajectoryName.trim()}>
                            <CIcon icon={cilSave} /> Guardar Trayectoria
                        </CButton>
                        <CButton color="warning" size="sm" variant="outline"
                            className="d-flex align-items-center justify-content-center gap-2"
                            onClick={onResetWaypoints}>
                            <CIcon icon={cilReload} /> Resetear Escena
                        </CButton>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StationPanel;
