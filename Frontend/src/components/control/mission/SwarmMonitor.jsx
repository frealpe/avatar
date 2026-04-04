import React from 'react';
import { CRow, CCol, CBadge } from '@coreui/react-pro';

const SwarmMonitor = ({ missionActive, activeSlaves, swarmState, droneColors, modeColors }) => {
    if (!missionActive) return null;

    return (
        <div
            className="p-2 rounded border border-secondary shadow-lg glass-effect"
            style={{
                width: '320px',
                background: 'rgba(10, 10, 10, 0.85)',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'auto'
            }}
        >
            <div className="small text-info fw-bold mb-2 d-flex justify-content-between align-items-center border-bottom border-secondary pb-1">
                <span className="d-flex align-items-center gap-1">
                    <div className="pulse-dot" /> MONITOR DE ENJAMBRE (CORE)
                </span>
                <CBadge color="success" className="opacity-75" style={{ fontSize: '0.5rem' }}>LIVE</CBadge>
            </div>
            <CRow className="g-2">
                {activeSlaves.map((dev, idx) => {
                    const mac = dev.mac_address || dev.mac;
                    const state = swarmState[mac] || {};
                    const color = droneColors[idx % droneColors.length];
                    return (
                        <CCol xs={6} key={mac}>
                            <div className="p-1 rounded bg-black bg-opacity-50 border border-secondary" style={{ fontSize: '0.65rem' }}>
                                <div className="d-flex align-items-center gap-1 mb-1">
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                                    <span className="fw-bold truncate text-white">{dev.name || mac.slice(-5)}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <CBadge
                                        color={modeColors[state.mode] || 'secondary'}
                                        style={{ fontSize: '0.55rem', padding: '1px 3px' }}
                                    >
                                        {state.mode || 'IDLE'}
                                    </CBadge>
                                    <span className={`fw-bold ${state.battery < 20 ? 'text-danger' : 'text-success'}`}>
                                        {state.battery ?? '??'}%
                                    </span>
                                </div>
                            </div>
                        </CCol>
                    );
                })}
            </CRow>
            <style>{`.pulse-dot { width: 6px; height: 6px; background: #00ff00; border-radius: 50%; box-shadow: 0 0 5px #00ff00; animation: pulse 1.5s infinite; } @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } } .glass-effect { border: 1px solid rgba(255,255,255,0.1) !important; }`}</style>
        </div>
    );
};

export default SwarmMonitor;
