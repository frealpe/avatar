import React, { useRef, useState } from 'react'
import iotApi from '../../service/iotApi'

const LaboratorioIA = () => {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [aiResult, setAiResult] = useState(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setAiResult(null);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result;

                const data = await iotApi.generateAvatar(base64data, 'mobile_user_01');

                if (data.ok) {
                    setAiResult(data.avatar);
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
        <div className="p-8 text-white min-h-[80vh] flex flex-col gap-6">
            <h2 className="text-2xl font-bold font-['Space_Grotesk'] text-[#00f1fe]">Laboratorio de Inteligencia Artificial</h2>
            <p className="text-gray-400">Sube una imagen para fusionar nuestra tubería de Escaneo 3D Trellis con el Extraactor Automático de Patrones Locales.</p>

            <div className="bg-[#1c2024] p-6 rounded-xl border border-[#45484c]/20 max-w-xl">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                />

                <button
                    onClick={() => fileInputRef.current.click()}
                    disabled={isUploading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#0b0e11] border border-[#d800ff]/50 rounded-lg hover:bg-[#d800ff]/20 transition-all group shadow-[0_0_15px_rgba(216,0,255,0.1)]"
                >
                    <span className={`material-symbols-outlined text-[#d800ff] text-3xl ${isUploading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`}>
                        {isUploading ? 'autorenew' : 'science'}
                    </span>
                    <span className="text-sm font-bold text-[#d800ff] tracking-widest uppercase">
                        {isUploading ? 'Invocando Neural Engines...' : 'Subir Imágen al Cerebro'}
                    </span>
                </button>
            </div>

            {aiResult && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">
                    {/* Panel 3D Pipeline Trellis */}
                    <div className="bg-[#111418] p-6 rounded-xl border border-[#45484c]/30 flex flex-col gap-4">
                        <h3 className="text-lg text-[#00f1fe] flex items-center gap-2">
                            <span className="material-symbols-outlined">3d_rotation</span>
                            Malla Anatómica
                        </h3>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Gradio / Trellis / Microsoft</p>

                        {aiResult.meshUrl ? (
                            <a href={aiResult.meshUrl} target="_blank" rel="noreferrer" className="inline-block px-4 py-2 mt-2 bg-[#00f1fe]/10 text-[#00f1fe] border border-[#00f1fe]/50 rounded text-sm text-center font-bold hover:bg-[#00f1fe]/20">
                                Descargar Modelo GLB
                            </a>
                        ) : (
                            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-md">
                                <p className="text-red-400 text-sm">Falló la generación volumétrica en Gradio.</p>
                            </div>
                        )}
                    </div>

                    {/* Panel 2D Pipeline Seamly */}
                    <div className="bg-[#111418] p-6 rounded-xl border border-[#45484c]/30 flex flex-col gap-4">
                        <h3 className="text-lg text-[#d800ff] flex items-center gap-2">
                            <span className="material-symbols-outlined">architecture</span>
                            Patrón Vectorial Paramétrico
                        </h3>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">Ollama / LLaVA / Seamly2D</p>

                        {aiResult.patternUrl ? (
                            <div className="mt-2 bg-white rounded-lg p-2 border border-gray-700">
                                <img src={aiResult.patternUrl} alt="SVG Pattern" className="w-full h-auto object-contain" />
                            </div>
                        ) : (
                            <div className="text-gray-400 text-sm mt-2">
                                <p className="mb-2">⚠️ Patrón SVG visual no generado. Esto suele suceder si el servidor no tiene compilado un archivo "patron_base.val" nativo con el que mezclar la data.</p>

                                <p className="font-bold text-[#d800ff] uppercase tracking-widest mt-4 mb-1">DATA JSON CRUDA:</p>
                                <pre className="text-xs bg-[#0b0e11] p-3 rounded-lg block whitespace-pre-wrap shadow-inner border border-[#45484c]/20 text-[#a9abaf]">
                                    {JSON.stringify(aiResult.garmentParams, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default LaboratorioIA;
