import React, { useRef, useState, Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, PerspectiveCamera, Stage } from '@react-three/drei'
import { useLocation } from 'react-router-dom'
import iotApi from '../../service/iotApi'
import { SocketContext } from '../../context/SocketContext'
import useStore from '../../store'

// --- Helpers ---
const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = iotApi.API_BASE || 'http://localhost:8080';
    let cleanUrl = url.replace(/\/\//g, '/');
    if (cleanUrl.startsWith('/api/') && (cleanUrl.includes('/patterns/') || cleanUrl.includes('/temp/') || cleanUrl.includes('/avatars/'))) {
        cleanUrl = cleanUrl.replace('/api/', '/');
    }
    return `${base}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
};

const LaboratorioIA = () => {
    const location = useLocation();
    const bodyInputRef = useRef(null);
    const garmentInputRef = useRef(null);
    const { socket } = React.useContext(SocketContext);
    const { setAvatar, user } = useStore();

    const [tab, setTab] = useState('BODY'); // 'BODY' or 'GARMENT'
    const [bodyState, setBodyState] = useState({ loading: false, result: null, telemetry: null, timer: 0 });
    const [garmentState, setGarmentState] = useState({ loading: false, result: null, telemetry: null, timer: 0 });
    const [garmentView, setGarmentView] = useState('2D'); // '2D' or '3D'
    const [editableMeasurements, setEditableMeasurements] = useState(null);
    const [betas, setBetas] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const [catalog, setCatalog] = useState([]);

    // 0. Cargar catálogo de prendas
    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const res = await iotApi.getClothesCatalog();
                if (res.ok) setCatalog(res.data);
            } catch (err) { console.error("Error fetching catalog:", err); }
        };
        fetchCatalog();
    }, []);

    // 1. Cargar desde localStorage al montar si no hay datos en location
    useEffect(() => {
        if (!location.state?.predefined) {
            const savedBody = localStorage.getItem('modavatar_active_body');
            if (savedBody) {
                try {
                    const parsed = JSON.parse(savedBody);
                    if (parsed.meshUrl) {
                        const fullGlbUrl = getFullUrl(parsed.meshUrl);
                        fetch(fullGlbUrl, { method: 'HEAD' })
                            .then(r => {
                                if (!r.ok) throw new Error('GLB stale');
                                setBodyState(prev => ({ ...prev, result: parsed, loading: false }));
                                if (parsed.measurements) setEditableMeasurements(parsed.measurements);
                                if (parsed.betas) {
                                    const b = [...parsed.betas];
                                    while (b.length < 12) b.push(0);
                                    setBetas(b);
                                }
                            })
                            .catch(() => {
                                localStorage.removeItem('modavatar_active_body');
                            });
                    } else {
                        setBodyState(prev => ({ ...prev, result: parsed, loading: false }));
                    }
                } catch (e) { console.error("Error parsing saved body:", e); }
            }
        }
    }, [location.state]);

    // 2. Cargar modelo predefinido
    useEffect(() => {
        if (location.state?.predefined) {
            const model = location.state.predefined;
            const newResult = {
                meshUrl: getFullUrl(model.meshUrl),
                measurements: model.measurements,
                betas: model.betas || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                modelType: model.name || 'SAM3D_Standard'
            };
            setBodyState({
                loading: false,
                result: { ...newResult, gender: model.gender || 'neutral' },
                telemetry: { totalExecutionTime: 'Instantáneo', modelsUsed: ['Anny Library'] },
                timer: 0
            });
            if (newResult.measurements) setEditableMeasurements(newResult.measurements);
            if (newResult.betas) {
                const b = [...newResult.betas];
                while (b.length < 12) b.push(0);
                setBetas(b);
            }
        }
    }, [location.state]);

    // Timers
    useEffect(() => {
        let bodyInterval, garmentInterval;
        if (bodyState.loading) bodyInterval = setInterval(() => setBodyState(p => ({ ...p, timer: p.timer + 0.1 })), 100);
        if (garmentState.loading) garmentInterval = setInterval(() => setGarmentState(p => ({ ...p, timer: p.timer + 0.1 })), 100);
        return () => { clearInterval(bodyInterval); clearInterval(garmentInterval); };
    }, [bodyState.loading, garmentState.loading]);

    // Socket Listener
    useEffect(() => {
        if (!socket) return;
        const handleAvatarCompleted = (data) => {
            const res = data.avatar;
            if (res.meshUrl || data.target === 'body') {
                setBodyState(prev => ({ ...prev, loading: false, result: res, telemetry: data.telemetry }));
                if (res.measurements) setEditableMeasurements(res.measurements);
                if (res.betas) {
                    const b = [...res.betas];
                    while (b.length < 12) b.push(0);
                    setBetas(b);
                }
                if (res.meshUrl) localStorage.setItem('modavatar_active_body', JSON.stringify(res));
            }
            if (res.patternUrl || data.target === 'garment') {
                setGarmentState(prev => ({ ...prev, loading: false, result: res, telemetry: data.telemetry }));
            }
        };
        socket.on('avatar:completed', handleAvatarCompleted);
        socket.on('avatar:error', (err) => {
            alert('Error en el pipeline de IA');
            setBodyState(p => ({ ...p, loading: false }));
            setGarmentState(p => ({ ...p, loading: false }));
        });
        return () => {
            socket.off('avatar:completed', handleAvatarCompleted);
            socket.off('avatar:error');
        };
    }, [socket]);

    const handleUpload = async (e, target) => {
        const file = e.target.files[0];
        if (!file) return;

        const isGlb = file.name.toLowerCase().endsWith('.glb');
        const stateSetter = target === 'body' ? setBodyState : setGarmentState;
        stateSetter(prev => ({ ...prev, loading: true, result: null, timer: 0 }));

        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const userId = user?.uid || user?._id || 'guest_user';
                let data;

                if (isGlb && target === 'garment') {
                    // Carga y análisis directo de GLB
                    data = await iotApi.analyzeGarmentGlb(reader.result, userId);
                    if (data.ok) {
                        stateSetter(prev => ({
                            ...prev,
                            loading: false,
                            result: {
                                ...data,
                                prenda3D: data.meshUrl,
                                garmentParams: data.garmentParams
                            }
                        }));
                        setGarmentView('3D');
                    }
                } else {
                    // Pipeline de IA basado en imagen
                    data = await iotApi.generateAvatar(reader.result, userId, target);
                }

                if (data && !data.ok) stateSetter(prev => ({ ...prev, loading: false }));
            } catch (err) {
                console.error("Upload error:", err);
                stateSetter(prev => ({ ...prev, loading: false }));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSelectGarment = (item) => {
        const measurements = item.measurements || {
            ancho_cm: item.ancho_cm || 0,
            largo_cm: item.largo_cm || 0,
            profundidad_cm: item.profundidad_cm || 0,
            pecho_cm: item.pecho_cm || 0,
            cintura_cm: item.cintura_cm || 0,
            brazo_cm: item.brazo_cm || 0
        };

        setGarmentState({
            loading: false,
            result: {
                _id: item._id,
                ok: true,
                prenda3D: item.prenda3D,
                garmentParams: measurements
            },
            telemetry: { totalExecutionTime: 'Carga Directa', modelsUsed: ['Biblioteca Local'] },
            timer: 0
        });
        setGarmentView('3D');
        // También actualizar los valores editables para que se vean de inmediato
        setEditableMeasurements(measurements);
    };

    const [recalculating, setRecalculating] = useState(false);
    const [activePart, setActivePart] = useState('TORSO');

    const bodyPartGroups = {
        CABEZA: { indices: [7, 9], icon: 'face', label: 'Cabeza & Cuello', color: '#00f1fe' },
        TORSO: { indices: [0, 1, 2, 3, 4, 6, 8, 11], icon: 'accessibility_new', label: 'Tronco & Proporción', color: '#d800ff' },
        BRAZOS: { indices: [10], icon: 'fitness_center', label: 'Ext. Superiores', color: '#facd2e' },
        PIERNAS: { indices: [5], icon: 'directions_run', label: 'Ext. Inferiores', color: '#00fe85' }
    };

    const handleRecalculate = async (newBetas) => {
        setRecalculating(true);
        const betasToSubmit = newBetas || betas;
        try {
            const genderToUse = bodyState.result?.gender || 'neutral';
            const res = await iotApi.recalculateAvatar(betasToSubmit, genderToUse);
            if (res.ok) {
                const finalResult = { ...bodyState.result, ...res, meshUrl: getFullUrl(res.meshUrl), betas: betasToSubmit };
                setBodyState(prev => ({ ...prev, result: finalResult }));
                if (res.measurements) setEditableMeasurements(res.measurements);
                localStorage.setItem('modavatar_active_body', JSON.stringify(finalResult));
            }
        } catch (e) { console.error(e); }
        finally { setRecalculating(false); }
    };

    const updateBeta = (index, val) => {
        const next = [...betas];
        next[index] = parseFloat(val);
        setBetas(next);
        if (socket) socket.emit('avatar:preview', { betas: next });
    };

    return (
        <div className="p-4 md:p-8 text-white min-h-screen bg-[#080a0c] font-['Inter']">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h2 className="text-3xl font-black font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-[#00f1fe] to-[#d800ff] tracking-tight uppercase">
                        LABORATORIO NEURAL MODAVATAR
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-1 font-bold">Dual-Track AI Analysis Pipeline v.5.0</p>
                </div>

                <div className="flex bg-[#161a1e] p-1 rounded-2xl border border-white/5 w-fit">
                    <button
                        onClick={() => setTab('BODY')}
                        className={`px-8 py-3 rounded-xl transition-all font-black text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 ${tab === 'BODY' ? 'bg-[#00f1fe] text-black shadow-[0_0_20px_rgba(0,241,254,0.4)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-sm">person</span> Análisis Corporal
                    </button>
                    <button
                        onClick={() => setTab('GARMENT')}
                        className={`px-8 py-3 rounded-xl transition-all font-black text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 ${tab === 'GARMENT' ? 'bg-[#d800ff] text-white shadow-[0_0_20px_rgba(216,0,255,0.4)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-sm">apparel</span> Análisis Prenda
                    </button>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto p-4 lg:p-10">
                {tab === 'BODY' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3">
                            <Panel title="" icon="visibility" state={bodyState} inputRef={bodyInputRef} onUpload={(e) => handleUpload(e, 'body')} color="#00f1fe">
                                {bodyState.result?.meshUrl ? (
                                    <ModelErrorBoundary>
                                        <Canvas shadows dpr={[1, 2]}>
                                            <PerspectiveCamera makeDefault position={[0, 1, 4]} fov={45} />
                                            <Suspense fallback={null}>
                                                <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                                    <Model key={getFullUrl(bodyState.result.meshUrl)} url={getFullUrl(bodyState.result.meshUrl)} />
                                                </Stage>
                                            </Suspense>
                                            <OrbitControls makeDefault />
                                        </Canvas>
                                    </ModelErrorBoundary>
                                ) : <EmptyState message="Esperando Escaneo Corporal" icon="biotech" />}
                            </Panel>
                        </div>

                        <div className="lg:col-span-2">
                            <Panel title="" icon="neurology" state={{ ...bodyState, loading: recalculating }} color="#00f1fe" hideUpload={true}>
                                {bodyState.result ? (
                                    <div className="flex flex-col h-full overflow-hidden">
                                        <div className="flex bg-[#0d1014]/50 border-b border-white/5 p-3 rounded-t-xl -mt-4 -mx-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00f1fe] w-full text-center">Consola Bio-Métrica</h4>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-4 mt-2">
                                            <div className="grid grid-cols-4 gap-2 px-1">
                                                {Object.entries(bodyPartGroups).map(([id, group]) => (
                                                    <button key={id} onClick={() => setActivePart(id)}
                                                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${activePart === id ? `bg-white/5 border-[${group.color}]/50 shadow-[0_0_15px_${group.color}22]` : 'bg-[#161a1e]/40 border-white/5 hover:bg-white/5'}`}>
                                                        <span className="material-symbols-outlined text-lg" style={{ color: activePart === id ? group.color : '' }}>{group.icon}</span>
                                                        <span className={`text-[7px] font-black uppercase tracking-widest ${activePart === id ? 'text-white' : 'text-gray-500'}`}>{id}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                {bodyPartGroups[activePart].indices.map((i) => {
                                                    const labels = ["Estatura", "Peso", "Complexión", "Hombros", "Cadera", "Piernas", "Cintura", "Cuello", "Profundidad", "Cabeza", "Brazos", "Busto / Pecho"];
                                                    const METRIC_CONFIG = {
                                                        0: { base: 170.0, delta: 7.0, unit: "cm" },
                                                        1: { base: 72.0, delta: 6.0, unit: "kg" },
                                                        2: { base: 95.0, delta: 5.0, unit: "cm" },
                                                        3: { base: 42.0, delta: 2.5, unit: "cm" },
                                                        4: { base: 100.0, delta: 6.0, unit: "cm" },
                                                        5: { base: 85.0, delta: 4.0, unit: "cm" },
                                                        6: { base: 82.0, delta: 5.0, unit: "cm" },
                                                        7: { base: 38.0, delta: 2.0, unit: "cm" },
                                                        8: { base: 22.0, delta: 3.0, unit: "cm" },
                                                        9: { base: 56.0, delta: 1.5, unit: "cm" },
                                                        10: { base: 65.0, delta: 3.0, unit: "cm" },
                                                        11: { base: 92.0, delta: 6.0, unit: "cm" },
                                                    };
                                                    const config = METRIC_CONFIG[i];
                                                    const v = betas[i];
                                                    const displayValue = config ? (config.base + (v * config.delta)).toFixed(1) : v.toFixed(2);
                                                    return (
                                                        <div key={i} className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-2 group hover:border-white/10 transition-all">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-wider">{labels[i] || `BETA ${i}`}</span>
                                                                    {config && <span className="text-xs font-black text-white">{displayValue} <span className="text-[8px] text-gray-600 ml-0.5">{config.unit}</span></span>}
                                                                </div>
                                                                <input type="number" step={config ? "0.1" : "0.01"} value={displayValue}
                                                                    onChange={(e) => {
                                                                        const num = parseFloat(e.target.value) || 0;
                                                                        updateBeta(i, config ? (num - config.base) / config.delta : num);
                                                                    }}
                                                                    onBlur={() => handleRecalculate()}
                                                                    className="w-16 bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-[10px] font-mono text-right focus:border-[#00f1fe] outline-none" style={{ color: bodyPartGroups[activePart].color }} />
                                                            </div>
                                                            <input type="range" min="-5" max="5" step="0.1" value={v} onChange={(e) => updateBeta(i, e.target.value)} onMouseUp={() => handleRecalculate()} className="w-full h-1.5 accent-white cursor-pointer" style={{ accentColor: bodyPartGroups[activePart].color }} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-[#0d1014] border-t border-white/5 flex gap-2">
                                            <button onClick={() => handleRecalculate()} disabled={recalculating} className="flex-1 py-1.5 bg-[#d800ff] text-white font-black text-[8px] uppercase tracking-widest rounded-lg hover:scale-105 transition-all flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-[10px]">rebase_edit</span> Sincronizar
                                            </button>
                                            <button onClick={async () => {
                                                if (!bodyState.result) return;
                                                try {
                                                    const userId = user?.uid || user?._id;
                                                    const res = await iotApi.ensureAvatar({ ...bodyState.result, userId });
                                                    if (res.ok) {
                                                        alert('¡Avatar Guardado!');
                                                        setAvatar(res.avatar);
                                                        localStorage.setItem('modavatar_active_body', JSON.stringify(res.avatar));
                                                    }
                                                } catch (e) { alert('Error al guardar'); }
                                            }} className="px-3 py-1.5 bg-[#00f1fe] text-black font-black text-[8px] uppercase tracking-widest rounded-lg hover:scale-105 transition-all flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[10px]">save</span> Guardar Mi Avatar
                                            </button>
                                        </div>
                                    </div>
                                ) : <EmptyState message="Falta Datos Biométricos" icon="settings_accessibility" />}
                            </Panel>
                        </div>
                    </div>
                )}

                {tab === 'GARMENT' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-3">
                                <Panel title="" icon="apparel" state={garmentState} inputRef={garmentInputRef} onUpload={(e) => handleUpload(e, 'garment')} color="#d800ff" accept={tab === 'GARMENT' ? ".glb,image/*" : "image/*"}
                                    extraHeader={garmentState.result?.prenda3D && (
                                        <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 ml-4">
                                            <button onClick={() => setGarmentView('2D')} className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${garmentView === '2D' ? 'bg-[#d800ff] text-white' : 'text-gray-500'}`}>2D</button>
                                            <button onClick={() => setGarmentView('3D')} className={`px-3 py-1 rounded-md text-[8px] font-black uppercase transition-all ${garmentView === '3D' ? 'bg-[#d800ff] text-white' : 'text-gray-500'}`}>3D</button>
                                        </div>
                                    )}>
                                    {garmentView === '3D' && garmentState.result?.prenda3D ? (
                                        <ModelErrorBoundary>
                                            <Canvas shadows dpr={[1, 2]}>
                                                <PerspectiveCamera makeDefault position={[0, 0, 2]} fov={45} />
                                                <Suspense fallback={null}>
                                                    <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                                        <Model key={getFullUrl(garmentState.result.prenda3D)} url={getFullUrl(garmentState.result.prenda3D)} />
                                                    </Stage>
                                                </Suspense>
                                                <OrbitControls makeDefault />
                                            </Canvas>
                                        </ModelErrorBoundary>
                                    ) : garmentState.result?.patternUrl ? (
                                        <div className="flex-1 bg-white rounded-2xl overflow-hidden p-6 shadow-inner flex items-center justify-center">
                                            <img src={garmentState.result.patternUrl} alt="SVG Pattern" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                        </div>
                                    ) : <EmptyState message="Falta Escaneo de Prenda" icon="straighten" />}
                                </Panel>
                            </div>

                            <div className="lg:col-span-2">
                                <Panel title="" icon="analytics" color="#facd2e" hideUpload={true}>
                                    <div className="flex flex-col h-full overflow-hidden">
                                        <div className="flex bg-[#0d1014]/50 border-b border-white/5 p-3 rounded-t-xl -mt-4 -mx-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#facd2e] w-full text-center">Parámetros de Prenda</h4>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 mt-2">
                                            {garmentState.result?.garmentParams ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {Object.entries(garmentState.result.garmentParams).map(([k, v]) => (
                                                        <div key={k} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-[#facd2e]/30 transition-all">
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">{k.replace('_cm', '').replace('_', ' ')}</span>
                                                                <div className="flex items-baseline gap-1">
                                                                    <input
                                                                        type="number"
                                                                        value={v}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            setGarmentState(prev => ({
                                                                                ...prev,
                                                                                result: {
                                                                                    ...prev.result,
                                                                                    garmentParams: {
                                                                                        ...prev.result.garmentParams,
                                                                                        [k]: val
                                                                                    }
                                                                                }
                                                                            }));
                                                                        }}
                                                                        className="bg-transparent border-none text-xl font-bold text-[#facd2e] w-20 outline-none focus:ring-0"
                                                                    />
                                                                    <span className="text-[10px] text-gray-600 font-black">CM</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                                                <div className="h-full bg-[#facd2e] opacity-40 shadow-[0_0_10px_#facd2e]" style={{ width: `${Math.min((v / 100) * 100, 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10"><span className="material-symbols-outlined text-4xl mb-2">schema</span><p className="text-[10px] uppercase font-black tracking-widest">Esperando Telemetría...</p></div>}
                                        </div>
                                        <div className="p-3 bg-[#0d1014] border-t border-white/5">
                                            <button onClick={() => alert('Patrón Exportado')} className="w-full py-2 bg-[#facd2e] text-black font-black text-[8px] uppercase tracking-[0.2em] rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined text-[10px]">download</span> Descargar Patrón
                                            </button>
                                        </div>
                                    </div>
                                </Panel>
                            </div>
                        </div>

                        <div className="lg:col-span-full mt-6">
                            <GarmentCarousel
                                items={catalog}
                                onSelect={handleSelectGarment}
                                activeId={garmentState.result?._id}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const GarmentCarousel = ({ items, onSelect, activeId }) => (
    <div className="relative group/carousel">
        <div className="flex items-center justify-between mb-4 px-4">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#d800ff]/10 flex items-center justify-center border border-[#d800ff]/20">
                    <span className="material-symbols-outlined text-base text-[#d800ff]">grid_view</span>
                </div>
                <div>
                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-white">Catálogo de Alta Costura</h4>
                    <p className="text-[7px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Selección exclusiva</p>
                </div>
            </div>
            <div className="flex gap-2">
                <div className="px-2 py-0.5 bg-white/5 rounded-full border border-white/10 text-[7px] font-black text-gray-500 uppercase tracking-widest">
                    {items.length} ITEMS
                </div>
            </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x px-4 -mx-4">
            {items.map(item => (
                <button
                    key={item._id}
                    onClick={() => onSelect(item)}
                    className={`flex-shrink-0 w-32 group transition-all duration-500 snap-start ${activeId === item._id ? 'scale-105' : 'hover:scale-105'}`}
                >
                    <div className={`relative aspect-[3/4] rounded-[1.8rem] overflow-hidden border-2 transition-all duration-700 ${activeId === item._id
                        ? 'border-[#d800ff] shadow-[0_0_30px_rgba(216,0,255,0.4)] ring-2 ring-[#d800ff]/10'
                        : 'border-white/5 bg-gradient-to-br from-white/5 to-transparent group-hover:border-white/20'
                        }`}>
                        <img
                            src={getFullUrl(item.image)}
                            alt={item.name}
                            className={`w-full h-full object-cover transition-all duration-1000 ${activeId === item._id ? 'scale-110' : 'group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0'
                                }`}
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                        {/* Selection Indicator */}
                        {activeId === item._id && (
                            <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#d800ff] flex items-center justify-center shadow-lg animate-pulse">
                                <span className="material-symbols-outlined text-[14px] text-white font-black">check</span>
                            </div>
                        )}

                        {/* Label Overlay */}
                        <div className="absolute bottom-6 left-0 right-0 px-4 text-center transform transition-transform duration-500 group-hover:-translate-y-1">
                            <span className="text-[7px] font-black tracking-[0.3em] text-[#d800ff] uppercase mb-1 block opacity-0 group-hover:opacity-100 transition-opacity">Visualizar</span>
                            <p className={`text-[10px] font-black uppercase tracking-widest leading-tight ${activeId === item._id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                                }`}>
                                {item.name}
                            </p>
                        </div>
                    </div>
                </button>
            ))}
        </div>

        {/* Glow effect backgrounds */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-[#d800ff]/5 blur-[100px] pointer-events-none" />
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-48 h-48 bg-[#facd2e]/5 blur-[80px] pointer-events-none" />
    </div>
);

// --- Sub-components ---
const Panel = ({ title, icon, state, inputRef, onUpload, color, children, hideUpload, extraHeader, accept }) => (
    <div className="bg-[#111418] border border-[#45484c]/20 rounded-3xl p-4 flex flex-col gap-3 backdrop-blur-lg h-[540px] shadow-2xl transition-all relative">
        {(title || (!hideUpload && onUpload)) && (
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-xs" style={{ color }}>{icon}</span>
                    {title && <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</h3>}
                    {extraHeader}
                </div>
                {!hideUpload && state && onUpload && (
                    <div className="flex items-center gap-3">
                        <input type="file" ref={inputRef} onChange={onUpload} accept={accept || "image/*"} className="hidden" />
                        <button onClick={() => inputRef.current.click()} disabled={state.loading}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${state.loading ? 'bg-gray-800 text-gray-500' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}>
                            <span className="material-symbols-outlined text-xs">{state.loading ? 'sync' : 'upload_file'}</span>
                            {state.loading ? `${state.timer?.toFixed(1) || 0}s` : 'Subir'}
                        </button>
                    </div>
                )}
            </div>
        )}
        <div className="flex-1 relative overflow-hidden flex flex-col">
            {state?.loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                    <div className="w-8 h-8 border-t-2 rounded-full animate-spin mb-3" style={{ borderColor: color }}></div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] animate-pulse" style={{ color }}>Procesando...</p>
                </div>
            )}
            {children}
        </div>
    </div>
);

const EmptyState = ({ message, icon }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
        <span className="material-symbols-outlined text-5xl text-gray-700 mb-4">{icon}</span>
        <h3 className="text-gray-500 font-bold uppercase tracking-tighter text-sm">{message}</h3>
    </div>
);

class ModelErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full opacity-40 text-center p-4">
                    <span className="material-symbols-outlined text-4xl mb-2">broken_image</span>
                    <p className="text-[9px] uppercase font-black tracking-widest">Modelo no disponible</p>
                </div>
            );
        }
        return this.props.children;
    }
}

function Model({ url }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

export default LaboratorioIA;
