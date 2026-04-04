import React from 'react';

const SecurityConsole = ({ corrections, logContainerRef }) => {
    return (
        <div className="mt-2">
            <div className="small text-muted fw-bold mb-1 d-flex justify-content-between">
                <span>CONSOLA DE SEGURIDAD (CORE)</span>
                {corrections.length > 0 && <span className="text-info" style={{ fontSize: '0.6rem' }}>LIVE</span>}
            </div>
            <div
                ref={logContainerRef}
                className="bg-black border border-secondary rounded p-1"
                style={{ height: '100px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.65rem' }}
            >
                {corrections.length === 0 ? (
                    <div className="text-muted italic opacity-50 p-2 text-center">Esperando telemetría...</div>
                ) : (
                    corrections.map((c, i) => (
                        <div key={i} className={`mb-1 ${c.type === 'CORE' ? 'text-warning' : 'text-info'}`}>
                            [{c.ts.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                            {c.droneMac ? ` [${c.droneMac.slice(-5)}] ` : ' '}
                            <span className={c.type === 'SAFETY' || c.type === 'CORE' ? 'text-danger fw-bold' : ''}>
                                {c.msg || `${c.type}: Moviendo a ${c.newPos?.x?.toFixed(1)},${c.newPos?.z?.toFixed(1)}`}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SecurityConsole;
