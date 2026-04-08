import React, { useRef, useState, Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, ContactShadows, PerspectiveCamera, Stage } from '@react-three/drei'
import iotApi from '../../service/iotApi'

const LaboratorioIA = () => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [telemetry, setTelemetry] = useState(null);
    const [counter, setCounter] = useState(0);

    // Cronómetro visual mientras carga
    useEffect(() => {
        let interval;
        if (isUploading) {
            interval = setInterval(() => setCounter(prev => prev + 0.1), 100);
        } else {
            setCounter(0);
        }
        return () => clearInterval(interval);
    }, [isUploading]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setAiResult(null);
        setTelemetry(null);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result;
                const data = await iotApi.generateAvatar(base64data, 'mobile_user_01');

                if (data.ok) {
                    setAiResult(data.avatar);
                    setTelemetry(data.telemetry);
                } else {
                    alert('Error en el pipeline de IA:\n' + data.msg);
                }
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('[Error Upload Front]', err);
            alert('Falló la invocación a la IA del Servidor.');
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 text-white min-h-screen bg-[#080a0c] font-['Inter']">
            {/* Header / Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black font-['Space_Grotesk'] text-transparent bg-clip-text bg-gradient-to-r from-[#00f1fe] to-[#d800ff] tracking-tight">
                        LABORATORIO NEURAL MODAVATAR
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] mt-1 font-bold">Integrated Multi-Agent AI Pipeline v.4.0</p>
                </div>

                {/* Nueva Mini Área de Carga */}
                <div className="flex items-center gap-4 bg-[#111418] border border-[#45484c]/20 p-2 rounded-2xl backdrop-blur-md">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                    <button
                        onClick={() => fileInputRef.current.click()}
                        disabled={isUploading}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${isUploading
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-[#00f1fe] text-[#005f64] hover:shadow-[0_0_25px_rgba(0,241,254,0.4)] active:scale-95'
                            }`}
                    >
                        <span className="material-symbols-outlined text-sm">{isUploading ? 'sync' : 'upload_file'}</span>
                        {isUploading ? `Procesando: ${counter.toFixed(1)}s` : 'Analizar Imagen'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">

                {/* PANEL PRINCIPAL: Visualizador 3D */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                    <div className="relative aspect-video lg:aspect-auto lg:h-[600px] bg-[#0b0e11] rounded-3xl border border-[#45484c]/20 overflow-hidden shadow-2xl group">
                        {aiResult?.meshUrl ? (
                            <Canvas shadows dpr={[1, 2]}>
                                <PerspectiveCamera makeDefault position={[0, 1, 4]} fov={45} />
                                <Suspense fallback={null}>
                                    <Stage environment="city" intensity={0.5} contactShadow={{ opacity: 0.2, blur: 2 }}>
                                        <Model url={aiResult.meshUrl} />
                                        {aiResult.prenda3D && <Model url={aiResult.prenda3D} />}
                                    </Stage>
                                </Suspense>
                                <OrbitControls makeDefault />
                            </Canvas>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1c2024] to-[#0b0e11]">
                                <div className="w-16 h-16 border-t-2 border-[#00f1fe] rounded-full animate-spin mb-6 opacity-20"></div>
                                <span className="material-symbols-outlined text-6xl text-gray-700 mb-4">biotech</span>
                                <h3 className="text-gray-500 font-bold uppercase tracking-tighter text-xl">Esperando Secuencia de Entrada</h3>
                                <p className="text-gray-600 text-xs mt-2 max-w-xs">Carga una fotografía frontal para iniciar la reconstrucción volumétrica y paramétrica.</p>
                            </div>
                        )}

                        {/* Overlays del Visualizador */}
                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                            <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isUploading ? 'bg-yellow-400 animate-ping' : aiResult ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Status: {isUploading ? 'Inference' : aiResult ? 'Ready' : 'Idle'}</span>
                            </div>
                        </div>

                        {aiResult && (
                            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="flex gap-2">
                                    <button className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                        <span className="material-symbols-outlined text-[#00f1fe]">download</span>
                                    </button>
                                    <button className="p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/10 transition-colors text-white/40">
                                        <span className="material-symbols-outlined">share</span>
                                    </button>
                                </div>
                                <div className="px-6 py-4 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl text-right">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Modelo Generado</p>
                                    <h4 className="text-lg font-bold text-white">TRELLIS Body Mesh v2.1</h4>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* PANEL LATERAL: Métricas y Datos */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

                    {/* Tarjeta de Telemetría */}
                    <div className="bg-[#111418] border border-[#45484c]/20 rounded-3xl p-6 flex flex-col gap-6 backdrop-blur-lg">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Telemetría de IA</h3>
                            <span className="material-symbols-outlined text-[#00f1fe] text-sm">query_stats</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0b0e11] p-4 rounded-2xl border border-white/5">
                                <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Latencia Total</p>
                                <p className="text-xl font-['Space_Grotesk'] text-white">{telemetry?.totalExecutionTime || '0.00s'}</p>
                            </div>
                            <div className="bg-[#0b0e11] p-4 rounded-2xl border border-white/5">
                                <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Modelos Stack</p>
                                <p className="text-xl font-['Space_Grotesk'] text-white">{telemetry?.modelsUsed?.length || '0'}</p>
                            </div>
                        </div>

                        {/* Progress Bars de los Agentes */}
                        <div className="flex flex-col gap-4">
                            <MetricBar label="Diffusion Trellis (3D)" value={isUploading ? 85 : aiResult ? 100 : 0} color="#00f1fe" />
                            <MetricBar label="Vision LLaVA (Medidas)" value={isUploading ? 95 : aiResult ? 100 : 0} color="#d800ff" />
                            <MetricBar label="Seamly2D Export (SVG)" value={aiResult?.patternUrl ? 100 : 0} color="#22c55e" />
                        </div>
                    </div>

                    {/* Tarjeta de Análisis de Prenda */}
                    <div className="flex-1 bg-gradient-to-b from-[#111418] to-[#080a0c] border border-[#45484c]/20 rounded-3xl p-6 overflow-hidden relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Análisis Paramétrico</h3>
                            <span className="material-symbols-outlined text-[#d800ff] text-sm">straighten</span>
                        </div>

                        {aiResult?.garmentParams ? (
                            <div className="flex flex-col gap-4">
                                {Object.entries(aiResult.garmentParams).map(([key, val]) => (
                                    <div key={key} className="flex justify-between items-center py-2 border-b border-white/5">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{key.replace('_cm', '').replace('_', ' ')}</span>
                                        <span className="text-sm font-bold text-[#00f1fe]">{val} cm</span>
                                    </div>
                                ))}
                                {aiResult.patternUrl && (
                                    <div className="mt-4 p-2 bg-white rounded-2xl">
                                        <img src={aiResult.patternUrl} alt="SVG" className="w-full h-auto" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center opacity-20 italic text-xs text-gray-500">
                                Sin datos de análisis...
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

// Componentes Helper Internos
const MetricBar = ({ label, value, color }) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
            <span className="text-gray-500">{label}</span>
            <span style={{ color }}>{value}%</span>
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div
                className="h-full transition-all duration-1000 ease-out"
                style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
            ></div>
        </div>
    </div>
)

function Model({ url }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

export default LaboratorioIA;
