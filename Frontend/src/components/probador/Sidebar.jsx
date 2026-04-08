import React from 'react';
import { useProbadorStore } from '../../store/probador/probador.store';

const Sidebar = () => {
    const { bodyParams, updateBodyParam, resetParams } = useProbadorStore();

    const paramsConfig = [
        { label: 'Altura (cm)', key: 'height', min: 140, max: 210 },
        { label: 'Circunferencia Pecho', key: 'chest', min: 70, max: 130 },
        { label: 'Ancho Cintura', key: 'waist', min: 50, max: 110 },
        { label: 'Circunferencia Cadera', key: 'hips', min: 70, max: 130 }
    ];

    return (
        <aside className="w-[420px] h-full bg-[#101417]/40 backdrop-blur-3xl border-l border-[#45484c]/10 p-10 flex flex-col">
            <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                    <h3 className="font-['Space_Grotesk'] text-xl font-black text-white uppercase tracking-tight">Parámetros Corporales</h3>
                    <p className="text-[8px] uppercase text-[#a9abaf] tracking-[0.2em] font-bold">Ajuste Métrico</p>
                </div>
                <button
                    onClick={resetParams}
                    className="text-[9px] uppercase tracking-widest text-[#00F2FF] font-black cursor-pointer hover:underline bg-transparent border-none p-0"
                >
                    Restablecer
                </button>
            </div>

            <div className="flex-1 mt-10 space-y-10">
                {paramsConfig.map(param => {
                    const val = bodyParams[param.key];
                    const percent = Math.min(Math.max(((val - param.min) / (param.max - param.min)) * 100, 0), 100);

                    return (
                        <div key={param.label} className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[11px] font-bold text-[#a9abaf] uppercase tracking-widest">{param.label}</label>
                                <div className="px-3 py-1 rounded-md bg-[#1c2024] border border-[#45484c]/40">
                                    <span className="text-xs font-bold text-[#00F2FF] font-mono">{val.toFixed(1)}</span>
                                </div>
                            </div>
                            <div className="relative h-4 w-full flex items-center">
                                <div className="absolute inset-x-0 h-1.5 w-full bg-[#22262b] rounded-full pointer-events-none">
                                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#8C00E5] to-[#00F2FF] rounded-full" style={{ width: `${percent}%` }}></div>
                                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#00F2FF] shadow-[0_0_10px_rgba(0,242,255,0.8)] border-2 border-white pointer-events-none" style={{ left: `calc(${percent}% - 8px)` }}></div>
                                </div>
                                <input
                                    type="range"
                                    min={param.min} max={param.max} step="0.1"
                                    value={val}
                                    onChange={(e) => updateBodyParam(param.key, e.target.value)}
                                    className="opacity-0 w-full h-full cursor-pointer absolute inset-0 z-10"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-auto p-6 rounded-2xl bg-[#0b0e11]/60 border border-[#45484c]/20 flex gap-4 items-start">
                <span className="material-symbols-outlined text-[#00F2FF] text-lg">info</span>
                <p className="text-[10px] text-[#a9abaf] leading-relaxed">
                    Los cambios de medidas ajustarán el avatar 3D en tiempo real utilizando morph targets y escalas dinámicas.
                </p>
            </div>
        </aside>
    );
};

export default Sidebar;
