import React, { useState, useEffect, useRef } from 'react';
import { CCard, CCardBody, CCol, CRow, CButton, CProgress } from '@coreui/react-pro';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage } from '@react-three/drei';
import iotApi from '../../service/iotApi';
import useStore from '../../store.js';

const ModelPreview = ({ url }) => {
    const fullUrl = url.startsWith('http') ? url : `${iotApi.API_BASE}${url}`;
    const { scene } = useGLTF(fullUrl);
    return (
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1, 3], fov: 40 }} gl={{ alpha: true }}>
            <ambientLight intensity={0.5} />
            <Stage environment="city" intensity={0.5} contactShadow={false} adjustCamera={true}>
                <primitive object={scene} />
            </Stage>
        </Canvas>
    );
};

const EscaneoAvatar = () => {
    const navigate = useNavigate();
    const { setAvatar } = useStore();
    const [mode, setMode] = useState('CATALOG'); // 'SCAN' or 'CATALOG'
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [cameraError, setCameraError] = useState('');
    const [predefined, setPredefined] = useState([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Fetch predefined avatars
    useEffect(() => {
        if (mode === 'CATALOG') {
            setLoadingCatalog(true);
            iotApi.getPredefinedAvatars()
                .then(res => setPredefined(res.data))
                .catch(err => console.error("Error catalog:", err))
                .finally(() => setLoadingCatalog(false));
        }
    }, [mode]);

    // Enumerar dispositivos de video disponibles
    useEffect(() => {
        const getDevices = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                const deviceList = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
                setDevices(videoDevices);
                if (videoDevices.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(videoDevices[0].deviceId);
                }
            } catch (err) {
                setCameraError("Permiso de cámara denegado.");
            }
        };
        if (mode === 'SCAN') getDevices();
    }, [mode]);

    // Stream effect with cleanup
    useEffect(() => {
        if (mode !== 'SCAN' || !selectedDeviceId) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
            return;
        }

        const startStream = async () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: selectedDeviceId } }
                });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) { setCameraError("No se pudo iniciar la cámara."); }
        };
        startStream();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [selectedDeviceId, mode]);

    const startScan = () => {
        setScanning(true);
        let imageBase64 = null;
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        }

        let current = 0;
        const interval = setInterval(() => {
            current += 20; setProgress(current);
            if (current >= 100) {
                clearInterval(interval);
                setTimeout(() => navigate('/avatar/generacion', { state: { imageBase64 } }), 500);
            }
        }, 400);
    };

    const handleSelectPredefined = (model) => {
        // Solo navega a Laboratorio, NO guarda aún en el store
        // El guardado se hace cuando presionas el botón GUARDAR en Laboratorio
        navigate('/avatar/laboratorio', { state: { predefined: model } });
    };

    return (
        <CRow className="justify-content-center p-4">
            <CCol md={10} lg={8}>
                <div className="flex justify-center mb-8 gap-1 bg-[#161a1e] p-1 rounded-2xl border border-white/5 w-fit mx-auto">
                    <button
                        onClick={() => setMode('SCAN')}
                        className={`px-8 py-3 rounded-xl transition-all font-black text-[10px] tracking-[0.2em] uppercase ${mode === 'SCAN' ? 'bg-[#00f1fe] text-black shadow-[0_0_20px_rgba(0,241,254,0.4)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        Escaneo Neural
                    </button>
                    <button
                        onClick={() => setMode('CATALOG')}
                        className={`px-8 py-3 rounded-xl transition-all font-black text-[10px] tracking-[0.2em] uppercase ${mode === 'CATALOG' ? 'bg-[#d800ff] text-white shadow-[0_0_20px_rgba(216,0,255,0.4)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        Catálogo Anny
                    </button>
                </div>

                <CCard style={{ backgroundColor: '#0b0e11', color: '#f8f9fe', border: '1px solid #1c2126', borderRadius: '32px', overflow: 'hidden' }}>
                    <CCardBody className="p-0">
                        {mode === 'SCAN' ? (
                            <div className="p-8">
                                <div className="text-center mb-6">
                                    <h5 className="font-['Space_Grotesk'] text-[#00f1fe] font-black tracking-tight uppercase">Analizador de Proporciones Humana</h5>
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">IA Body Reconstruction v4.2</p>
                                </div>

                                <div className="relative h-[500px] bg-[#101417] rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center">
                                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" style={{ opacity: scanning ? 0.2 : 1 }} />

                                    {!scanning && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <button
                                                onClick={startScan}
                                                className="w-24 h-24 rounded-full border-[6px] border-[#00f1fe] bg-black/20 backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-[0_0_30px_rgba(0,241,254,0.3)] group pointer-events-auto"
                                            >
                                                <div className="w-16 h-16 rounded-full bg-[#00f1fe] group-hover:bg-white transition-colors flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-black font-black">photo_camera</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 pointer-events-none border-[20px] border-[#0b0e11]" />
                                    <div className="absolute top-10 left-10 w-10 h-10 border-t-2 border-l-2 border-[#00f1fe]" />
                                    <div className="absolute top-10 right-10 w-10 h-10 border-t-2 border-r-2 border-[#00f1fe]" />
                                    <div className="absolute bottom-10 left-10 w-10 h-10 border-b-2 border-l-2 border-[#00f1fe]" />
                                    <div className="absolute bottom-10 right-10 w-10 h-10 border-b-2 border-r-2 border-[#00f1fe]" />

                                    {scanning && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                                            <div className="w-16 h-16 border-t-2 border-[#00f1fe] rounded-full animate-spin mb-4" />
                                            <span className="text-[10px] font-black tracking-[0.5em] text-[#00f1fe] animate-pulse">Analizando Cuerpo...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 flex flex-col items-center gap-4">
                                    {!scanning ? (
                                        <div className="text-center">
                                            <p className="text-[10px] text-[#00f1fe] font-black uppercase tracking-[0.3em] mb-4">Pulsa el disparador para capturar</p>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-sm">
                                            <CProgress value={progress} className="h-1 bg-white/5" color="info" />
                                        </div>
                                    )}
                                    <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Colócate a 2 metros de la cámara</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8">
                                <div className="text-center mb-10">
                                    <h5 className="font-['Space_Grotesk'] text-[#d800ff] font-black tracking-tight uppercase">Modelos Anny Predefinidos</h5>
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Selección Estándar de Biometría Humana</p>
                                </div>

                                {loadingCatalog ? (
                                    <div className="h-[400px] flex items-center justify-center">
                                        <div className="w-8 h-8 border-t-2 border-[#d800ff] rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {predefined.map((model) => (
                                            <div
                                                key={model.id}
                                                onClick={() => handleSelectPredefined(model)}
                                                className="group relative bg-[#161a20] border border-white/5 rounded-3xl p-6 cursor-pointer hover:border-[#d800ff]/50 transition-all hover:translate-y-[-5px]"
                                            >
                                                <div className="h-48 bg-black/20 rounded-2xl mb-6 flex items-center justify-center overflow-hidden pointer-events-none">
                                                    <ModelPreview url={model.meshUrl} />
                                                </div>
                                                <h4 className="text-sm font-black uppercase mb-2 tracking-tight">{model.name}</h4>
                                                <p className="text-[10px] text-gray-500 mb-6 leading-relaxed uppercase font-bold">{model.description}</p>

                                                <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
                                                    <div className="flex justify-between text-[9px] uppercase font-black">
                                                        <span className="text-gray-600">Altura</span>
                                                        <span className="text-[#d800ff]">{model.measurements.height}cm</span>
                                                    </div>
                                                    <div className="flex justify-between text-[9px] uppercase font-black">
                                                        <span className="text-gray-600">Pecho</span>
                                                        <span className="text-[#d800ff]">{model.measurements.chest}cm</span>
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-6 right-6 flex gap-2">
                                                    <a
                                                        href={`${iotApi.API_BASE}${model.meshUrl}`}
                                                        download
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#00f1fe] hover:text-black transition-all"
                                                        title="Descargar GLB"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">download</span>
                                                    </a>
                                                    <button className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#d800ff] group-hover:text-white transition-all">
                                                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </CCardBody>
                </CCard>
            </CCol>
        </CRow>
    );
};

export default EscaneoAvatar;
