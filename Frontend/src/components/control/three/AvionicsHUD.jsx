import React from 'react';
import { CRow, CCol, CBadge } from '@coreui/react-pro';

const normalizeMac = (m) => m ? m.replace(/:/g, '').toLowerCase() : '';

const AvionicsHUD = ({ activeSlaves, telemetry }) => {
    if (!activeSlaves || activeSlaves.length === 0) return null;

    return (
        <div
            className="p-2 rounded shadow-lg avionics-glass"
            style={{
                width: '320px',
                pointerEvents: 'none', // Allow clicking through the HUD to the 3D canvas
                fontFamily: '"Courier New", Courier, monospace',
                color: '#00ff00',
            }}
        >
            <div className="small fw-bold mb-2 border-bottom border-success pb-1 text-center" style={{ letterSpacing: '2px' }}>
                [ AVIONICS HUD ]
            </div>

            <div className="d-flex flex-column gap-2">
                {activeSlaves.map((dev) => {
                    const mac = dev.mac_address || dev.mac;
                    const data = telemetry[normalizeMac(mac)] || {};

                    // Extract values, fallback to '--' if not yet received
                    const roll = data.r !== undefined ? data.r : '--';
                    const pitch = data.p !== undefined ? data.p : '--';
                    const yaw = data.y !== undefined ? data.y : '--';
                    const alt = data.a !== undefined ? (data.a / 100).toFixed(1) : '--';
                    const bat = data.b !== undefined ? Number(data.b).toFixed(1) : '--';
                    const mode = data.m !== undefined ? data.m : 'UNK';

                    // Artificial Horizon minimal indicators
                    const pitchDisplay = pitch !== '--' ? Math.abs(pitch).toString().padStart(2, '0') + (pitch < 0 ? ' D' : ' U') : '--';

                    return (
                        <div key={mac} className="p-2 bg-black bg-opacity-75 border border-success rounded">
                            <div className="d-flex justify-content-between align-items-center mb-1 text-white">
                                <span className="fw-bold fs-6">{dev.name || mac.slice(-5)}</span>
                                <CBadge color="success" shape="rounded-pill">{mode}</CBadge>
                            </div>

                            {/* --- Artificial Horizon (Avionics HUD) --- */}
                            <div className="d-flex justify-content-center my-2 position-relative" style={{ height: '120px', overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(0, 255, 0, 0.3)', background: 'rgba(0,30,0,0.2)' }}>
                                <svg width="100%" height="100%" viewBox="0 0 200 120">
                                    <g transform={`translate(100, 60) rotate(${-(roll !== '--' ? roll : 0)}) translate(0, ${(pitch !== '--' ? pitch : 0) * 1.5}) translate(-100, -60)`}>
                                        <line x1="-100" y1="60" x2="300" y2="60" stroke="#00ff00" strokeWidth="1.5" />
                                        {[-40, -30, -20, -10, 10, 20, 30, 40].map(angle => {
                                            const y = 60 - (angle * 1.5);
                                            const isUp = angle > 0;
                                            return (
                                                <g key={angle}>
                                                    <line x1="75" y1={y} x2="92" y2={y} stroke="#00ff00" strokeWidth="1" strokeDasharray={isUp ? "" : "3,3"} />
                                                    <line x1="108" y1={y} x2="125" y2={y} stroke="#00ff00" strokeWidth="1" strokeDasharray={isUp ? "" : "3,3"} />
                                                    <text x="70" y={y + 3} fill="#00ff00" fontSize="10" textAnchor="end">{Math.abs(angle)}</text>
                                                    <text x="130" y={y + 3} fill="#00ff00" fontSize="10" textAnchor="start">{Math.abs(angle)}</text>
                                                    <line x1="75" y1={y} x2="75" y2={y + (isUp ? 4 : -4)} stroke="#00ff00" strokeWidth="1" />
                                                    <line x1="125" y1={y} x2="125" y2={y + (isUp ? 4 : -4)} stroke="#00ff00" strokeWidth="1" />
                                                </g>
                                            );
                                        })}
                                    </g>
                                    {/* Fixed Aircraft Reticle */}
                                    <path d="M 60 60 L 90 60 L 100 65 L 110 60 L 140 60" fill="none" stroke="#fff" strokeWidth="2" />
                                    <circle cx="100" cy="62" r="2" fill="#fff" />
                                </svg>
                            </div>

                            <CRow className="g-1 text-center" style={{ fontSize: '0.8rem' }}>
                                <CCol xs={4}>
                                    <div className="text-secondary small">ROLL</div>
                                    <div className="fw-bold">{roll}°</div>
                                </CCol>
                                <CCol xs={4}>
                                    <div className="text-secondary small">PITCH</div>
                                    <div className="fw-bold">{pitchDisplay}</div>
                                </CCol>
                                <CCol xs={4}>
                                    <div className="text-secondary small">YAW</div>
                                    <div className="fw-bold">{yaw}°</div>
                                </CCol>
                            </CRow>

                            <CRow className="g-1 text-center mt-1 border-top border-success border-opacity-50 pt-1" style={{ fontSize: '0.8rem' }}>
                                <CCol xs={6}>
                                    <div className="text-secondary small">ALT (m)</div>
                                    <div className="fw-bold text-info">{alt}</div>
                                </CCol>
                                <CCol xs={6}>
                                    <div className="text-secondary small">BAT (V)</div>
                                    <div className={`fw-bold ${bat !== '--' && bat < 7.0 ? 'text-danger blinking' : 'text-success'}`}>{bat}</div>
                                </CCol>
                            </CRow>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .avionics-glass {
                    background: rgba(0, 20, 0, 0.4);
                    backdrop-filter: blur(4px);
                    border: 1px solid rgba(0, 255, 0, 0.3);
                    text-shadow: 0 0 4px #00ff00;
                }
                .blinking {
                    animation: bat-blink 1s infinite alternate;
                }
                @keyframes bat-blink {
                    from { opacity: 1; text-shadow: 0 0 8px red; }
                    to { opacity: 0.3; text-shadow: none; }
                }
            `}</style>
        </div>
    );
};

export default AvionicsHUD;
