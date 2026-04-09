import React, { useRef, useState, Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, PerspectiveCamera, Stage } from '@react-three/drei'
import { useLocation } from 'react-router-dom'
import iotApi from '../../service/iotApi'
import { SocketContext } from '../../context/SocketContext'

const LaboratorioIA = () => {
    const location = useLocation();
    const bodyInputRef = useRef(null);
    const garmentInputRef = useRef(null);
    const { socket } = React.useContext(SocketContext);

    const [tab, setTab] = useState('BODY'); // 'BODY' or 'GARMENT'
    const [bodyState, setBodyState] = useState({ loading: false, result: null, telemetry: null, timer: 0 });
    const [garmentState, setGarmentState] = useState({ loading: false, result: null, telemetry: null, timer: 0 });

    // 1. Cargar desde localStorage al montar si no hay datos en location
    useEffect(() => {
        if (!location.state?.predefined) {
            const savedBody = localStorage.getItem('modavatar_active_body');
            if (savedBody) {
                try {
                    const parsed = JSON.parse(savedBody);
                    setBodyState(prev => ({ ...prev, result: parsed, loading: false }));
                    if (parsed.measurements) setEditableMeasurements(parsed.measurements);
                    if (parsed.betas) setBetas(parsed.betas);
                    console.log("🧬 [Lab IA] Perfil recordado:", parsed.modelType || 'Avatar');
                } catch (e) { console.error("Error parsing saved body:", e); }
            }
        }
    }, [location.state]);

    // 2. Cargar modelo predefinido si viene de Escaneo y Guardar en local
    useEffect(() => {
        if (location.state?.predefined) {
            const model = location.state.predefined;
            const newResult = {
                meshUrl: model.meshUrl.startsWith('http') ? model.meshUrl : `http://localhost:8080${model.meshUrl}`,
                measurements: model.measurements,
                betas: model.betas || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                modelType: model.name || 'SMPLX_Standard'
            };
            setBodyState({
                loading: false,
                result: newResult,
                telemetry: { totalExecutionTime: 'Instantáneo', modelsUsed: ['SMPL-X Library'] },
                timer: 0
            });
            setEditableMeasurements(model.measurements);
            if (model.betas) setBetas(model.betas);
            // Persistir como perfil
            localStorage.setItem('modavatar_active_body', JSON.stringify(newResult));
        }
    }, [location.state]);

    // Timers for visual feedback
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
            console.log("🧬 [Lab IA] Evento recibido:", data);
            const res = data.avatar;

            if (res.meshUrl || data.target === 'body') {
                setBodyState(prev => ({ ...prev, loading: false, result: res, telemetry: data.telemetry }));
                if (res.measurements) setEditableMeasurements(res.measurements);
                if (res.meshUrl) localStorage.setItem('modavatar_active_body', JSON.stringify(res));
            }
            if (res.patternUrl || data.target === 'garment') {
                setGarmentState(prev => ({ ...prev, loading: false, result: res, telemetry: data.telemetry }));
            }
        };

        const handleAvatarError = (err) => {
            console.error("❌ [Lab IA] Error:", err);
            alert('Error en el pipeline de IA:\n' + (err.message || err));
            setBodyState(p => ({ ...p, loading: false }));
            setGarmentState(p => ({ ...p, loading: false }));
        };

        socket.on('avatar:completed', handleAvatarCompleted);
        socket.on('avatar:error', handleAvatarError);

        return () => {
            socket.off('avatar:completed', handleAvatarCompleted);
            socket.off('avatar:error', handleAvatarError);
        };
    }, [socket]);

    const handleUpload = async (e, target) => {
        const file = e.target.files[0];
        if (!file) return;

        const stateSetter = target === 'body' ? setBodyState : setGarmentState;
        stateSetter(prev => ({ ...prev, loading: true, result: null, timer: 0 }));

        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const data = await iotApi.generateAvatar(reader.result, 'mobile_user_01', target);
                if (!data.ok) {
                    alert('Error: ' + data.msg);
                    stateSetter(prev => ({ ...prev, loading: false }));
                }
            } catch (err) {
                alert('No se pudo conectar con el servidor.');
                stateSetter(prev => ({ ...prev, loading: false }));
            }
        };
        reader.readAsDataURL(file);
    };

    const [editableMeasurements, setEditableMeasurements] = useState(null);
    const [betas, setBetas] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const [recalculating, setRecalculating] = useState(false);

    // ... handleSaveMeasurements ...
    const handleRecalculate = async (newBetas) => {
        setRecalculating(true);
        try {
            const res = await iotApi.recalculateAvatar(newBetas || betas, 'neutral');
            if (res.ok) {
                const absoluteMeshUrl = res.meshUrl.startsWith('http') ? res.meshUrl : `http://localhost:8080${res.meshUrl}`;
                const finalResult = { ...bodyState.result, ...res, meshUrl: absoluteMeshUrl, betas: newBetas || betas };
                setBodyState(prev => ({
                    ...prev,
                    result: finalResult
                }));
                if (res.measurements) setEditableMeasurements(res.measurements);
                localStorage.setItem('modavatar_active_body', JSON.stringify(finalResult));
            }
        } catch (e) {
            console.error("Error recalibrando malla:", e);
            const errorMsg = e.response?.data?.msg || e.message || 'Error desconocido';
            alert(`⚠️ Error al recalibrar la malla 3D:\n${errorMsg}\n\nVerifica que el servidor esté encendido en el puerto 8080.`);
        }
        finally { setRecalculating(false); }
    };

    const updateBeta = (index, val) => {
        const next = [...betas];
        next[index] = parseFloat(val);
        setBetas(next);

        // Emitir vista previa en tiempo real para interpolación suave en el Probador
        if (socket) {
            socket.emit('avatar:preview', { betas: next });
        }
    };

    // return block update ...

    return (
        <div className="p-4 md:p-8 text-white min-h-screen bg-[#080a0c] font-['Inter']">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h2 className="text-3xl font-black font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-[#00f1fe] to-[#d800ff] tracking-tight uppercase">
                        LABORATORIO NEURAL MODAVATAR
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-1 font-bold">Dual-Track AI Analysis Pipeline v.5.0</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-[#161a1e] p-1 rounded-2xl border border-white/5 w-fit">
                    <button
                        onClick={() => setTab('BODY')}
                        className={`px-8 py-3 rounded-xl transition-all font-black text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 ${tab === 'BODY' ? 'bg-[#00f1fe] text-black shadow-[0_0_20px_rgba(0,241,254,0.4)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-sm">person</span>
                        Análisis Corporal
                    </button>
                    <button
                        onClick={() => setTab('GARMENT')}
                        className={`px-8 py-3 rounded-xl transition-all font-black text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 ${tab === 'GARMENT' ? 'bg-[#d800ff] text-white shadow-[0_0_20px_rgba(216,0,255,0.4)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-sm">apparel</span>
                        Análisis Prenda
                    </button>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto p-4 lg:p-10">
                {/* PANEL CUERPO 3D */}
                {tab === 'BODY' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Ventana 1: Visor 3D (3/5) */}
                        <div className="lg:col-span-3">
                            <Panel
                                title="Visualización 3D Real"
                                icon="visibility"
                                state={bodyState}
                                inputRef={bodyInputRef}
                                onUpload={(e) => handleUpload(e, 'body')}
                                color="#00f1fe"
                            >
                                {bodyState.result?.meshUrl ? (
                                    <Canvas shadows dpr={[1, 2]} className="">
                                        <PerspectiveCamera makeDefault position={[0, 1, 4]} fov={45} />
                                        <Suspense fallback={null}>
                                            <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                                <Model key={bodyState.result.meshUrl} url={bodyState.result.meshUrl} />
                                            </Stage>
                                        </Suspense>
                                        <OrbitControls makeDefault />
                                    </Canvas>
                                ) : (
                                    <EmptyState message="Esperando Escaneo Corporal" icon="biotech" />
                                )}
                            </Panel>
                        </div>

                        {/* Ventana 2: Editor (2/5) */}
                        <div className="lg:col-span-2">
                            <Panel
                                title="BIO-NEURO CONSOLE"
                                icon="neurology"
                                state={{ ...bodyState, loading: recalculating }}
                                inputRef={null}
                                onUpload={null}
                                color="#00f1fe"
                                hideUpload={true}
                            >
                                {bodyState.result ? (
                                    <div className="flex flex-col h-full overflow-hidden">
                                        <div className="flex bg-[#0d1014]/50 border-b border-white/5 p-3 rounded-t-xl">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00f1fe]">Consola Bio-Métrica</h4>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                                            {/* SECCIÓN: SHAPE BETAS (PAREJAS) */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {betas.map((v, i) => {
                                                    const labels = ["Estatura", "Peso", "Músculo", "Hombros", "Cadera", "Piernas", "Torso", "Cuello", "Fondo", "Cabeza"];
                                                    // Configuración de transformación para los parámetros principales
                                                    const METRIC_CONFIG = {
                                                        0: { base: 170.0, delta: 7.0, unit: "cm" }, // Estatura
                                                        1: { base: 72.0, delta: 6.0, unit: "kg" },  // Peso
                                                        2: { base: 95.0, delta: 5.0, unit: "cm" },  // Músculo (Pecho)
                                                        3: { base: 42.0, delta: 2.5, unit: "cm" },  // Hombros
                                                        4: { base: 100.0, delta: 6.0, unit: "cm" }, // Cadera
                                                        5: { base: 85.0, delta: 4.0, unit: "cm" },  // Piernas
                                                        6: { base: 82.0, delta: 5.0, unit: "cm" },  // Torso (Cintura)
                                                        7: { base: 38.0, delta: 2.0, unit: "cm" },  // Cuello
                                                        8: { base: 22.0, delta: 3.0, unit: "cm" },  // Fondo
                                                        9: { base: 56.0, delta: 1.5, unit: "cm" },  // Cabeza
                                                    };

                                                    const config = METRIC_CONFIG[i];

                                                    // Valor a mostrar: Si hay config, calculamos el valor en CM, si no, mostramos el Beta crudo (sigma)
                                                    const displayValue = config
                                                        ? (config.base + (v * config.delta)).toFixed(1)
                                                        : v.toFixed(2);

                                                    const handleInputChange = (val) => {
                                                        const num = parseFloat(val) || 0;
                                                        if (config) {
                                                            // Transformación Inversa: Beta = (ValorCM - Base) / Delta
                                                            const newBeta = (num - config.base) / config.delta;
                                                            updateBeta(i, newBeta);
                                                        } else {
                                                            updateBeta(i, num);
                                                        }
                                                    };
                                                    return (
                                                        <div key={i} className="bg-black/40 p-2.5 rounded-xl border border-white/5 space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black uppercase text-gray-500">{labels[i] || `BETA ${i}`}</span>
                                                                    {config && (
                                                                        <span className="text-[10px] font-bold text-[#00f1fe]">{displayValue} {config.unit}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        step={config ? "0.1" : "0.01"}
                                                                        value={displayValue}
                                                                        onChange={(e) => handleInputChange(e.target.value)}
                                                                        onBlur={() => handleRecalculate()}
                                                                        className="w-16 bg-white/5 border border-white/10 rounded-md py-0.5 px-1 text-[10px] font-mono text-[#d800ff] text-right focus:border-[#d800ff] outline-none"
                                                                    />
                                                                    <span className="text-[8px] text-gray-600 font-bold uppercase">{config ? 'cm' : 'σ'}</span>
                                                                </div>
                                                            </div>
                                                            <input
                                                                type="range" min="-5" max="5" step="0.1" value={v}
                                                                onChange={(e) => updateBeta(i, e.target.value)}
                                                                onMouseUp={() => handleRecalculate()}
                                                                className="w-full h-1 bg-white/10 rounded-lg appearance-none accent-[#d800ff]"
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-[#0d1014] border-t border-white/5 flex gap-2">
                                            <button
                                                onClick={() => handleRecalculate()}
                                                disabled={recalculating}
                                                className="flex-1 py-3 bg-[#d800ff] text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">rebase_edit</span> Sincronizar
                                            </button>
                                            <button onClick={() => alert('Perfil Guardado')} className="px-4 py-3 bg-white/5 text-gray-400 rounded-xl border border-white/10 hover:bg-white/10">
                                                <span className="material-symbols-outlined text-sm">save</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <EmptyState message="Falta Datos Biométricos" icon="settings_accessibility" />
                                )}
                            </Panel>
                        </div>
                    </div>
                )}

                {/* PANEL ESCANEO DE ROPA */}
                {tab === 'GARMENT' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Ventana 1: Escaneo Estructural (3/5) */}
                        <div className="lg:col-span-3">
                            <Panel
                                title="Escaneo Estructural / Patrón"
                                icon="apparel"
                                state={garmentState}
                                inputRef={garmentInputRef}
                                onUpload={(e) => handleUpload(e, 'garment')}
                                color="#d800ff"
                            >
                                {garmentState.result?.patternUrl ? (
                                    <div className="flex-1 bg-white rounded-2xl overflow-hidden p-6 shadow-inner flex items-center justify-center">
                                        <img src={garmentState.result.patternUrl} alt="SVG Pattern" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                                    </div>
                                ) : (
                                    <EmptyState message="Falta Escaneo de Prenda" icon="straighten" />
                                )}
                            </Panel>
                        </div>

                        {/* Ventana 2: Consola de Geometría (2/5) */}
                        <div className="lg:col-span-2">
                            <Panel
                                title="Geometría de Prenda"
                                icon="analytics"
                                color="#facd2e"
                                hideUpload={true}
                            >
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div className="flex bg-[#0d1014]/50 border-b border-white/5 p-3 rounded-t-xl">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#facd2e]">Parámetros de Prenda</h4>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 mt-2">
                                        {garmentState.result?.garmentParams ? (
                                            <div className="grid grid-cols-1 gap-3">
                                                {Object.entries(garmentState.result.garmentParams).map(([k, v]) => (
                                                    <div key={k} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-[#facd2e]/30 transition-all">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">{k.replace('_cm', '').replace('_', ' ')}</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-xl font-bold text-[#facd2e]">{v}</span>
                                                                <span className="text-[10px] text-gray-600 font-black">CM</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#facd2e] opacity-40 shadow-[0_0_10px_#facd2e]" style={{ width: `${Math.min((v / 100) * 100, 100)}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
                                                <span className="material-symbols-outlined text-4xl mb-2">schema</span>
                                                <p className="text-[10px] uppercase font-black tracking-widest">Esperando Telemetría de Patrón...</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 bg-[#0d1014] border-t border-white/5">
                                        <button onClick={() => alert('Patrón Exportado (.VAL)')} className="w-full py-4 bg-[#facd2e] text-black font-black text-[9px] uppercase tracking-[0.3em] rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-sm">download</span> Descargar Patrón
                                        </button>
                                    </div>
                                </div>
                            </Panel>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Componentes Helper Internos
const Panel = ({ title, icon, state, inputRef, onUpload, color, children, hideUpload }) => (
    <div className="bg-[#111418] border border-[#45484c]/20 rounded-3xl p-5 flex flex-col gap-4 backdrop-blur-lg h-[800px] shadow-2xl transition-all">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xs" style={{ color }}>{icon}</span>
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</h3>
            </div>
            {!hideUpload && state && (
                <div className="flex items-center gap-3">
                    <input type="file" ref={inputRef} onChange={onUpload} accept="image/*" className="hidden" />
                    <button
                        onClick={() => inputRef.current.click()}
                        disabled={state.loading}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all ${state.loading
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 active:scale-95'
                            }`}
                    >
                        <span className="material-symbols-outlined text-xs">{state.loading ? 'sync' : 'upload_file'}</span>
                        {state.loading ? `${state.timer?.toFixed(1) || 0}s` : 'Subir'}
                    </button>
                </div>
            )}
        </div>

        <div className="flex-1 relative overflow-hidden">
            {state?.loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
                    <div className="w-8 h-8 border-t-2 rounded-full animate-spin mb-3" style={{ borderColor: color }}></div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] animate-pulse" style={{ color }}>Procesando...</p>
                </div>
            )}
            {children}
        </div>
    </div>
)

const EmptyState = ({ message, icon }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10">
        <span className="material-symbols-outlined text-5xl text-gray-700 mb-4">{icon}</span>
        <h3 className="text-gray-500 font-bold uppercase tracking-tighter text-sm">{message}</h3>
    </div>
)

function Model({ url }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

export default LaboratorioIA;
