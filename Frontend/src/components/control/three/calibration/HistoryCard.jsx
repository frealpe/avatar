import React from 'react';

const HistoryCard = ({ rec, sensorOptions }) => {
    const dt = new Date(rec.createdAt);
    const sensor = sensorOptions.find(s => s.id === rec.sensor) || sensorOptions[0];
    return (
        <div className="rounded p-2 mb-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.78rem' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-bold text-info">{sensor.emoji} {sensor.label}</span>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                    {dt.toLocaleDateString()} {dt.toLocaleTimeString()}
                </span>
            </div>
            <div className="d-flex gap-3 text-muted flex-wrap">
                {['sys', 'gyro', 'accel', 'mag'].map(k => (
                    <span key={k}>
                        <strong style={{ color: (rec.stats?.[k] ?? 0) >= 3 ? '#20c997' : '#ffc107' }}>
                            {rec.stats?.[k] ?? 0}/3
                        </strong> {k}
                    </span>
                ))}
                {rec.durationMs > 0 && <span className="ms-auto">{Math.round(rec.durationMs / 1000)}s</span>}
            </div>
        </div>
    );
};

export default HistoryCard;
