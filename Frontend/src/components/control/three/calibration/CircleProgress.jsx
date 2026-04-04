import React from 'react';

const CircleProgress = ({ value, max = 3, color, size = 90, label, icon, done }) => {
    const r = (size / 2) - 8;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(value / max, 1);
    const dash = circ * pct;
    return (
        <div className="d-flex flex-column align-items-center gap-1">
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff11" strokeWidth="7" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                    stroke={done ? '#20c997' : color}
                    strokeWidth="7"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
                <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="middle"
                    fontSize="18" fill={done ? '#20c997' : color}>
                    {done ? '✓' : icon}
                </text>
                <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="11"
                    fill={done ? '#20c997' : '#aaa'}>
                    {done ? '¡Listo!' : `${value}/3`}
                </text>
            </svg>
            <span style={{ fontSize: '0.65rem', color: done ? '#20c997' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
            </span>
        </div>
    );
};

export default CircleProgress;
