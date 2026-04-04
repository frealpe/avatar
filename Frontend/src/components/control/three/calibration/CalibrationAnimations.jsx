import React from 'react';

export const StillAnimation = () => (
    <g>
        <rect x="-30" y="-12" width="60" height="24" rx="6" fill="#20c99733" stroke="#20c997" strokeWidth="1.5" />
        <circle cx="-18" cy="0" r="4" fill="#20c997" opacity="0.7" />
        <circle cx="18" cy="0" r="4" fill="#20c997" opacity="0.7" />
        <line x1="-8" y1="0" x2="8" y2="0" stroke="#20c997" strokeWidth="2" />
        <ellipse cx="0" cy="22" rx="25" ry="4" fill="none" stroke="#20c99744" strokeWidth="1" />
        <ellipse cx="0" cy="28" rx="18" ry="3" fill="none" stroke="#20c99722" strokeWidth="1" />
    </g>
);

export const Rotate6Animation = ({ t }) => {
    const angle = (Math.sin(t * 0.8) * 35);
    return (
        <g transform={`rotate(${angle})`}>
            <rect x="-30" y="-12" width="60" height="24" rx="6" fill="#0dcaf033" stroke="#0dcaf0" strokeWidth="1.5" />
            <circle cx="-18" cy="0" r="4" fill="#0dcaf0" opacity="0.7" />
            <circle cx="18" cy="0" r="4" fill="#0dcaf0" opacity="0.7" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#0dcaf0" strokeWidth="2" />
        </g>
    );
};

export const Figure8Animation = ({ t }) => {
    const x = Math.sin(t) * 40;
    const y = Math.sin(t * 2) * 18;
    return (
        <>
            <path d="M-40,0 C-40,-30 0,-30 0,0 C0,30 40,30 40,0 C40,-30 0,-30 0,0 C0,30 -40,30 -40,0"
                fill="none" stroke="#fd7e1433" strokeWidth="2" strokeDasharray="4,4" />
            <g transform={`translate(${x},${y})`}>
                <rect x="-16" y="-7" width="32" height="14" rx="4" fill="#fd7e1433" stroke="#fd7e14" strokeWidth="1.5" />
                <circle cx="-10" cy="0" r="3" fill="#fd7e14" opacity="0.8" />
                <circle cx="10" cy="0" r="3" fill="#fd7e14" opacity="0.8" />
            </g>
        </>
    );
};
