import React from 'react';

const Sparkline = ({ data, color, width = 200, height = 36 }) => {
    if (!data || data.length < 2) return null;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (v / 3) * (height - 4) - 2;
        return `${x},${y}`;
    }).join(' ');
    return (
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
    );
};

export default Sparkline;
